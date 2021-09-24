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

    test('it pushes main branch to latest', () => {
        const execMock = jest.fn();
        const setOutputMock = jest.fn();
        const setFailedMock = jest.fn();

        process.env.GITHUB_REF = 'refs/heads/main';
        
        release(execMock, setOutputMock, setFailedMock);

        expect(execMock.mock.calls.length).toBe(5);
        expect(execMock.mock.calls[0][0]).toBe("docker login -u USERNAME --password-stdin");
        expect(execMock.mock.calls[1][0]).toBe("docker build -t my/repository:latest .");
        expect(execMock.mock.calls[2][0]).toBe("docker push my/repository:latest");
        expect(execMock.mock.calls[3][0]).toBe("docker inspect --format={{index .RepoDigests 0}} my/repository:latest");
        expect(execMock.mock.calls[4][0]).toBe("docker logout");

        expect(setOutputMock.mock.calls.length).toBe(1);
        expect(setOutputMock.mock.calls[0][0]).toBe("tag");
        expect(setOutputMock.mock.calls[0][1]).toBe("latest");
    })

    test('it pushes master branch to latest', () => {
        const execMock = jest.fn();
        const setOutputMock = jest.fn();
        const setFailedMock = jest.fn();

        process.env.GITHUB_REF = 'refs/heads/master';
        
        release(execMock, setOutputMock, setFailedMock);

        expect(execMock.mock.calls.length).toBe(5);
        expect(execMock.mock.calls[0][0]).toBe("docker login -u USERNAME --password-stdin");
        expect(execMock.mock.calls[1][0]).toBe("docker build -t my/repository:latest .");
        expect(execMock.mock.calls[2][0]).toBe("docker push my/repository:latest");
        expect(execMock.mock.calls[3][0]).toBe("docker inspect --format={{index .RepoDigests 0}} my/repository:latest");
        expect(execMock.mock.calls[4][0]).toBe("docker logout");

        expect(setOutputMock.mock.calls.length).toBe(1);
        expect(setOutputMock.mock.calls[0][0]).toBe("tag");
        expect(setOutputMock.mock.calls[0][1]).toBe("latest");
    })

    test('it pushes branch as name of the branch', () => {
        const execMock = jest.fn();
        const setOutputMock = jest.fn();
        const setFailedMock = jest.fn();

        process.env.GITHUB_REF = 'refs/heads/myBranch';
        
        release(execMock, setOutputMock, setFailedMock);

        expect(execMock.mock.calls.length).toBe(5);
        expect(execMock.mock.calls[0][0]).toBe("docker login -u USERNAME --password-stdin");
        expect(execMock.mock.calls[1][0]).toBe("docker build -t my/repository:myBranch .");
        expect(execMock.mock.calls[2][0]).toBe("docker push my/repository:myBranch");
        expect(execMock.mock.calls[3][0]).toBe("docker inspect --format={{index .RepoDigests 0}} my/repository:myBranch");
        expect(execMock.mock.calls[4][0]).toBe("docker logout");

        expect(setOutputMock.mock.calls.length).toBe(1);
        expect(setOutputMock.mock.calls[0][0]).toBe("tag");
        expect(setOutputMock.mock.calls[0][1]).toBe("myBranch");
    })
})