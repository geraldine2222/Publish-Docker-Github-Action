const { setOutput } = require('@actions/core');
const { release } = require('../src/release');

describe('releasing', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...OLD_ENV };
        process.env.INPUT_USERNAME = 'USERNAME';
        process.env.INPUT_NAME = 'my/repository';
    });

    afterAll(() => {
        process.env = OLD_ENV;
        process.stdout = "";
    });

    const cases = [
        [
            'it pushes main branch to latest',
            function () {
                process.env.GITHUB_REF = 'refs/heads/main';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'it pushes master branch to latest',
            function () {
                process.env.GITHUB_REF = 'refs/heads/master';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'it pushes branch as name of the branch',
            function () {
                process.env.GITHUB_REF = 'refs/heads/myBranch';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['myBranch']);
            }
        ],
        [
            'it converts dashes in branch to hyphens',
            function () {
                process.env.GITHUB_REF = 'refs/heads/myBranch/withDash';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['myBranch-withDash']);
            }
        ],
        [
            'it pushes tags to latest',
            function () {
                process.env.GITHUB_REF = 'refs/tags/myRelease';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'with tag names it pushes tags using the name',
            function () {
                process.env.GITHUB_REF = 'refs/tags/myRelease';
                process.env.INPUT_TAG_NAMES = 'true';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['myRelease']);
            }
        ],
        [
            'with tag names set to false it doesnt push tags using the name',
            function () {
                process.env.GITHUB_REF = 'refs/tags/myRelease';
                process.env.INPUT_TAG_NAMES = 'false';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'with tag semver it pushes tags using the major and minor versions (single digit)',
            function () {
                process.env.GITHUB_REF = 'refs/tags/v1.2.3';
                process.env.INPUT_TAG_SEMVER = 'true';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['1.2.3', '1.2', '1']);
            }
        ],
        [
            'with tag semver but no semver',
            function () {
                process.env.GITHUB_REF = 'refs/tags/no_semver';
                process.env.INPUT_TAG_SEMVER = 'true';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'with tag semver it pushes tags using the major and minor versions (multi digits)',
            function () {
                process.env.GITHUB_REF = 'refs/tags/v12.345.5678';
                process.env.INPUT_TAG_SEMVER = 'true';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['12.345.5678', '12.345', '12']);
            }
        ],
        [
            'with tag semver it pushes tags without "v"-prefix',
            function () {
                process.env.GITHUB_REF = 'refs/tags/1.2.34';
                process.env.INPUT_TAG_SEMVER = 'true';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['1.2.34', '1.2', '1']);
            }
        ],
        [
            'with tag semver it pushes latest when tag has invalid semver version',
            function () {
                process.env.GITHUB_REF = 'refs/tags/vAA.BB.CC';
                process.env.INPUT_TAG_SEMVER = 'true';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'with tag semver it pushes latest when tag has invalid semver version',
            function () {
                process.env.GITHUB_REF = 'refs/tags/v1.2.34';
                process.env.INPUT_TAG_SEMVER = 'false';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expectPublishesImage(execMock, setOutputMock, 'my/repository', ['latest']);
            }
        ],
        [
            'it pushes specific Dockerfile to latest',
            function () {
                process.env.GITHUB_REF = 'refs/heads/master';
                process.env.INPUT_DOCKERFILE = 'MyDockerFileName';
            },
            function (execMock, setOutputMock, setFailedMock) {
                expect(execMock.mock.calls.length).toBe(5);
                expect(execMock.mock.calls[0][0]).toBe(`docker login -u USERNAME --password-stdin`);
                expect(execMock.mock.calls[1][0]).toBe(`docker build -f MyDockerFileName -t my/repository:latest .`);
                expect(execMock.mock.calls[2][0]).toBe(`docker push my/repository:latest`);
                expect(execMock.mock.calls[3][0]).toBe(`docker inspect --format={{index .RepoDigests 0}} my/repository:latest`);
                expect(execMock.mock.calls[4][0]).toBe(`docker logout`);

                expect(setOutputMock.mock.calls.length).toBe(1);
                expect(setOutputMock.mock.calls[0][0]).toBe(`tag`);
                expect(setOutputMock.mock.calls[0][1]).toBe(`latest`);
            }
        ],
    ]

    test.each(cases)('%s', (name, given, then) => {
        const execMock = jest.fn();
        const setOutputMock = jest.fn();
        const setFailedMock = jest.fn();

        given();
        release(execMock, setOutputMock, setFailedMock);
        then(execMock, setOutputMock, setFailedMock);
    })
})

describe('with tag semver it pushes tags using the pre-release, but does not update the major, minor or patch version (with dot)', () => {
    // as pre-release versions tend to be unstable
    // https://semver.org/#spec-item-11
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...OLD_ENV };
        process.env.INPUT_USERNAME = 'USERNAME';
        process.env.INPUT_NAME = 'my/repository';
        process.env.INPUT_TAG_SEMVER = 'true';
    });

    afterAll(() => {
        process.env = OLD_ENV;
        process.stdout = "";
    });

    const suffix = ['alpha.1', 'alpha', 'ALPHA', 'ALPHA.11', 'beta', 'rc.11'];

    test.each(suffix)('%s', (suffix) => {
        const execMock = jest.fn();
        const setOutputMock = jest.fn();
        const setFailedMock = jest.fn();

        process.env.GITHUB_REF = 'refs/tags/v1.1.1-' + suffix;

        release(execMock, setOutputMock, setFailedMock);

        expectPublishesImage(execMock, setOutputMock, 'my/repository', ['1.1.1-' + suffix]);
    })
})

function expectPublishesImage(execMock, setOutputMock, name, tags) {
    expect(execMock.mock.calls.length).toBe(4 + (tags.length));

    expect(execMock.mock.calls[0][0]).toBe(`docker login -u USERNAME --password-stdin`);

    var buildTags = "";
    tags.forEach(tag => {
        buildTags += `-t ${name}:${tag} `
    });
    expect(execMock.mock.calls[1][0]).toBe(`docker build ${buildTags}.`);

    var i = 2;
    tags.forEach(tag => {
        expect(execMock.mock.calls[i][0]).toBe(`docker push ${name}:${tag}`);
        i++;
    });
    expect(execMock.mock.calls[i][0]).toBe(`docker inspect --format={{index .RepoDigests 0}} ${name}:${tags[0]}`);
    expect(execMock.mock.calls[i + 1][0]).toBe(`docker logout`);

    expect(setOutputMock.mock.calls.length).toBe(1);
    expect(setOutputMock.mock.calls[0][0]).toBe(`tag`);
    expect(setOutputMock.mock.calls[0][1]).toBe(`${tags[0]}`);
}
