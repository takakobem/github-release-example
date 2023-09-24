const core = require('@actions/core');
const github = require('@actions/github')
const Mustache = require('mustache');
const fs = require('fs');

const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];
const BASE_BRANCH = process.env['BASE_BRANCH'];
const HEAD_BRANCH = process.env['HEAD_BRANCH'];
const OWNER = process.env['OWNER'];
const REPO = process.env['REPO'];
const LABELS = process.env['LABELS'];
const TEMPLATE_FILE_NAME= process.env['TEMPLATE'];
const PAGER_LIMIT = 2;
const PAGER_COUNT = 100;
const TITLE = "Chore: release " + formatDate(new Date());

// Debug outputs
console.log("BASE_BRANCH: ", BASE_BRANCH);
console.log("HEAD_BRANCH: ", HEAD_BRANCH);
console.log("OWNER: ", OWNER);
console.log("REPO: ", REPO);
console.log("TEMPLATE_FILE_NAME: ", TEMPLATE_FILE_NAME);

async function getCommits() {
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const promises = generatePromises(octokit, retriveCommits);
  let resultCommits = [];
  const regex = /#(\d+)/;
  await Promise.all(promises).then((responses) => {
    for(const response of responses) {
      if (response.status !== 200) return;
      let mergeCommits = response.data.commits.flatMap((commit) => {
        // mainへのマージコミット
        if (commit.parents.length === 2) {
          const match = commit.commit.message.match(regex);
          if (match !== undefined && match !== null) {
            return Number(match[1]);
          }
        }
        return [];
      });
      mergeCommits = mergeCommits.filter(onlyUnique);
      resultCommits = resultCommits.concat(mergeCommits);
    }
  });
  return resultCommits;
}

async function getPullRequests(){
  let mergePulls = await getCommits() ?? [];
  const pullResults = {"fiture": [], "bug": [], "Others": []};
  const foundIds = [];

  const pullRequests = await getPulls(mergePulls);
  for (const key in pullResults) {
    pullResults[key] = pullRequests?.filter((pull)=> {
      const matched = pull.labels.some((label)=> label.name === key);
      if(matched) {
        foundIds.push(pull["id"]);
        return pull;
      }
      return null;
    });
  }

  pullResults["Others"] = pullRequests?.filter((pull)=> !foundIds.includes(pull.id));
  return pullResults;
}

async function getPulls(pulls){
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const options = {
    state: 'closed',
    base: HEAD_BRANCH,
    per_page: PAGER_COUNT,
    page: 1,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  }
  const promises = generatePromises(octokit, retrivePulls, options);
  let pullResults = [];
  await Promise.all(promises).then((responses)=>{
    for(const response of responses){
      response.data.filter((pull) => {
        if (pulls.includes(pull.number)) {
          pullResults.push(pull);
        }
      });
    }
  });
  return pullResults;
}

function generatePromises(octokit, method, options={}) {
  const promises = [];
  for (let i = 0; i < PAGER_LIMIT ; i++) {
    const local_option = {...options}
    local_option["page"] = i + 1;
    promises.push(method(octokit, local_option));
  }
  return promises;
}

async function retrivePulls(octokit, options){
  return octokit.request(
    `GET ${github.context.apiUrl}/repos/${OWNER}/${REPO}/pulls`,
    options
  );
}

async function retriveCommits(octokit, _options){
  return octokit.request(
    `GET ${github.context.apiUrl}/repos/${OWNER}/${REPO}/compare/${BASE_BRANCH}...${HEAD_BRANCH}`
  );
}

function formatDate(date) {
  const year= date.getFullYear();
  const month= date.getMonth() + 1;
  const day= date.getDate();
  return `${year}/${month}/${day}`;
}

function onlyUnique(value, index, array) {
  return value !== null && array.indexOf(value) === index;
}

const fileContent = fs.readFileSync(TEMPLATE_FILE_NAME, 'utf-8');
const description = Mustache.render(fileContent, pullRequestList);

async function createPullRequest(title, body){
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const requestBody = {
    owner: OWNER,
    repo: REPO,
    title: title,
    body: body,
    head: HEAD_BRANCH,
    base: BASE_BRANCH,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  const response = await octokit.request(
    `POST /repos/${OWNER}/${REPO}/pulls`,
    requestBody
  );
  return response;
}

async function addLabelToPullRequest(pullRequestNumber, labels) {
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const response = await octokit.request(
    `POST /repos/${OWNER}/${REPO}/issues/${pullRequestNumber}/labels`,
    { labels: labels });
  console.log('Label added:', response.status);
}

try {
  getPullRequests().then(pullRequestList => {
    pullRequestList["Title"] = TITLE;
    const fileContent = fs.readFileSync(TEMPLATE_FILE_NAME, 'utf-8');
    const description = Mustache.render(fileContent, pullRequestList);
    createPullRequest(TITLE, description).then(
      (response)=> {
        console.log("Request to create PR: #", response.data.number);
        const prId = response.data.number;
        addLabelToPullRequest(prId, LABELS.split("\s")).then((response)=>{
          console.log("Created labels: ",response);
        });
    });
    core.setOutput("Done!");
  });
} catch(e) {
  console.log(e);
  core.setOutput(e.message());
  return;
}
