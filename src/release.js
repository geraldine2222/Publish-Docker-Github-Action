const { getInput } = require('@actions/core');

function release(execSync, setOutput, setFailed) {
    const username = getInput("USERNAME", { require: true });
    const repositoryName = getInput("NAME", { require: true });
    const branch = process.env[`GITHUB_REF`].replace('refs/heads/', '');

    const tag = setTag(branch);

    execSync(`docker login -u ${username} --password-stdin`);
    execSync(`docker build -t ${repositoryName}:${tag} .`);
    execSync(`docker push ${repositoryName}:${tag}`);
    execSync(`docker inspect --format={{index .RepoDigests 0}} ${repositoryName}:${tag}`);
    execSync(`docker logout`);

    setOutput(`tag`, `${tag}`);


    function setTag(branch) {
        if (branch == 'main' || branch == 'master') {
            return "latest";
        }
        return branch;
    }
}

exports.release = release;