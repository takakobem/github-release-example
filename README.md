# github-release-example

## Prework

### Install and run Docker

Go to [docker site](https://www.docker.com/) and get docker.
After then, run Docker on your PC.

### Install act

[act](https://github.com/nektos/act) helps developments for GitHub Actions.
Run the following command to install act.

```sh
brew install act
```

### Get GitHub Token for development

Go to `Settings` > `Developper Settings` > `Personal access tokens`, then generate a new token.
The token is used for local debugging, so you have to set expiry and you can delete after debugging.

![Generating GitHub access token](./assets/img/github.com_settings_tokens_new.png)

### Set local environment variables

```sh
export GITHUB_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export BASE_BRANCH=release
export HEAD_BRANCH=main
export OWNER=dhythm
export REPO=github-release-example
export TEMPLATE=.github/git-pr-release.template
export LABELS=release
```

You can check environment variables by `printenv`.

## Development

### Debug scripts

Run the following command.

```sh
node .github/src/create_release_pr.js
```

### Debug GitHub Actions

Run the following command.

```sh
act --list --container-architecture linux/amd64
act --secret GITHUB_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -j release_pr --container-architecture linux/amd64
```

## Getting started

### Settings

You have to update `Settings` > `Actions` > `General` > `Workflow permissions`.

![Workflow permissions](./assets/img/Screenshot_2023-09-24_at_19.07.52.png)

### Run workflow

You can run the workflow by,

![Run workflow](./assets/img/Screenshot_2023-09-24_at_19.09.28.png)

## References

- https://tech.spacely.co.jp/entry/2023/07/26/100915
- https://damienaicheh.github.io/github/actions/2022/01/20/set-dynamic-parameters-github-workflows-en.html
