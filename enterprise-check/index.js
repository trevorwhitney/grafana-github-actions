"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
const core_1 = require("@actions/core");
const request_error_1 = require("@octokit/request-error");
class EnterpriseCheck extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'EnterpriseCheck';
    }
    async onTriggered(octokit) {
        const sourceBranch = (0, core_1.getInput)('source_branch');
        if (!sourceBranch) {
            throw new Error('Missing source branch');
        }
        const prNumber = (0, core_1.getInput)('pr_number');
        if (!prNumber) {
            throw new Error('Missing OSS PR number');
        }
        const sourceSha = (0, core_1.getInput)('source_sha');
        if (!sourceSha) {
            throw new Error('Missing OSS source SHA');
        }
        let branch = await getBranch(octokit, sourceBranch);
        if (branch) {
            // Create the branch from the ref found in grafana-enterprise.
            await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha);
            return;
        }
        // If the source branch was not found on Enterprise, then attempt to use the targetBranch (likely something like v9.2.x).
        // If the targetBranch was not found, then use `main`. If `main` wasn't found, then we have a problem.
        const targetBranch = (0, core_1.getInput)('target_branch') || 'main';
        branch = await getBranch(octokit, targetBranch);
        if (branch) {
            // Create the branch from the ref found in grafana-enterprise.
            await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha);
            return;
        }
        branch = await getBranch(octokit, 'main');
        if (!branch) {
            throw new Error('error retrieving main branch');
        }
        // Create the branch from the ref found in grafana-enterprise.
        await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha);
    }
}
async function getBranch(octokit, branch) {
    let res;
    try {
        res = await octokit.octokit.repos.getBranch({
            branch: branch,
            owner: 'grafana',
            repo: 'grafana-enterprise',
        });
        return res.data;
    }
    catch (err) {
        console.log('err: ', err);
    }
    return null;
}
async function createOrUpdateRef(octokit, prNumber, branch, sha, sourceSha) {
    try {
        await octokit.octokit.git.createRef({
            owner: 'grafana',
            repo: 'grafana-enterprise',
            ref: `refs/heads/prc-${prNumber}-${sourceSha}/${branch}`,
            sha: sha,
        });
    }
    catch (err) {
        if (err instanceof request_error_1.RequestError && err.message === 'Reference already exists') {
            await octokit.octokit.git.updateRef({
                owner: 'grafana',
                repo: 'grafana-enterprise',
                ref: `heads/prc-${prNumber}-${sourceSha}/${branch}`,
                sha: sha,
                force: true,
            });
        }
        else {
            throw err;
        }
    }
}
new EnterpriseCheck().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map