const { getInput } = require('@actions/core');

function release(execSync, setOutput, setFailed) {
    const username = getInput("USERNAME", { require: true });
    const repositoryName = getInput("NAME", { require: true });

    const githubReference = process.env[`GITHUB_REF`];

    execSync(`docker login -u ${username} --password-stdin`);

    var options = '';
    if (usesOption("DOCKERFILE")) {
        options += `-f ${getInput('DOCKERFILE', { require: false })} `;
    }
    const tags = translateDockerTag(githubReference);
    tags.forEach(tag => {
        options += `-t ${repositoryName}:${tag} `;
    });
    execSync(`docker build ${options}.`);

    tags.forEach(tag => {
        execSync(`docker push ${repositoryName}:${tag}`);
    });

    const firstTag = tags[0]
    execSync(`docker inspect --format={{index .RepoDigests 0}} ${repositoryName}:${firstTag}`);
    execSync(`docker logout`);

    setOutput(`tag`, `${firstTag}`);

    function translateDockerTag(githubReference) {
        const branch = githubReference
            .replace('refs/heads/', '')
            .replace('refs/tags/', '')
            .replace("/", "-");

        if (usesOption("TAG_SEMVER") && isSemver(githubReference)) {
            if (githubReference.replace('refs/tags/', '').includes('-')){
                return [trimPrefix(branch, "v")];
            } else {
                return splitSemver(trimPrefix(branch, "v"));
            }
        } else if (isOnMainBranch() || (isTag() && !usesOption("TAG_NAMES"))) {
            return ["latest"];
        }

        return [branch];

        function isSemver(githubReference) {
            return githubReference.match("^refs/tags/v?([0-9]+)\.([0-9]+)\.([0-9]+)(-[a-zA-Z]+(\.[0-9]+)?)?$");
        }

        function splitSemver(branch) {
            var parts = [];
            parts.push(branch);
            const i = branch.lastIndexOf(".");
            if (i != -1) {
                parts = parts.concat(splitSemver(branch.slice(0, i)));
            }
            return parts;
        }

        function isTag() {
            return githubReference.startsWith("refs/tags/");
        }

        function isOnMainBranch() {
            return githubReference == 'refs/heads/main' || githubReference == 'refs/heads/master';
        }
    }

    function usesOption(option) {
        const val = getInput(option, { require: false });
        return val != "" && val != "false";
    }

    function trimPrefix(str, prefix) {
        if (str.startsWith(prefix)) {
            return str.slice(prefix.length)
        }
        return str
    }
}

exports.release = release;