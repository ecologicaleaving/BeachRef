2025-07-26T08:25:55.3219831Z Current runner version: '2.326.0'
2025-07-26T08:25:55.3251393Z ##[group]Operating System
2025-07-26T08:25:55.3252601Z Ubuntu
2025-07-26T08:25:55.3253345Z 24.04.2
2025-07-26T08:25:55.3254058Z LTS
2025-07-26T08:25:55.3254750Z ##[endgroup]
2025-07-26T08:25:55.3255891Z ##[group]Runner Image
2025-07-26T08:25:55.3256817Z Image: ubuntu-24.04
2025-07-26T08:25:55.3257555Z Version: 20250720.1.0
2025-07-26T08:25:55.3259357Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250720.1/images/ubuntu/Ubuntu2404-Readme.md
2025-07-26T08:25:55.3261680Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250720.1
2025-07-26T08:25:55.3263332Z ##[endgroup]
2025-07-26T08:25:55.3264093Z ##[group]Runner Image Provisioner
2025-07-26T08:25:55.3265057Z 2.0.449.1
2025-07-26T08:25:55.3266042Z ##[endgroup]
2025-07-26T08:25:55.3267689Z ##[group]GITHUB_TOKEN Permissions
2025-07-26T08:25:55.3270807Z Contents: read
2025-07-26T08:25:55.3271656Z Metadata: read
2025-07-26T08:25:55.3272618Z Packages: read
2025-07-26T08:25:55.3273537Z ##[endgroup]
2025-07-26T08:25:55.3276737Z Secret source: Actions
2025-07-26T08:25:55.3277808Z Prepare workflow directory
2025-07-26T08:25:55.3721712Z Prepare all required actions
2025-07-26T08:25:55.3776708Z Getting action download info
2025-07-26T08:25:55.6454881Z ##[group]Download immutable action package 'actions/checkout@v4'
2025-07-26T08:25:55.6456174Z Version: 4.2.2
2025-07-26T08:25:55.6457155Z Digest: sha256:ccb2698953eaebd21c7bf6268a94f9c26518a7e38e27e0b83c1fe1ad049819b1
2025-07-26T08:25:55.6458309Z Source commit SHA: 11bd71901bbe5b1630ceea73d27597364c9af683
2025-07-26T08:25:55.6459114Z ##[endgroup]
2025-07-26T08:25:55.7266510Z Download action repository 'subosito/flutter-action@v2' (SHA:e938fdf56512cc96ef2f93601a5a40bde3801046)
2025-07-26T08:25:55.9709224Z Getting action download info
2025-07-26T08:25:56.0750348Z ##[group]Download immutable action package 'actions/cache@v4'
2025-07-26T08:25:56.0751108Z Version: 4.2.3
2025-07-26T08:25:56.0751949Z Digest: sha256:c8a3bb963e1f1826d8fcc8d1354f0dd29d8ac1db1d4f6f20247055ae11b81ed9
2025-07-26T08:25:56.0752917Z Source commit SHA: 5a3ec84eff668545956fd18022155c47e93e2684
2025-07-26T08:25:56.0753705Z ##[endgroup]
2025-07-26T08:25:56.2140720Z Complete job name: test
2025-07-26T08:25:56.2771617Z ##[group]Run actions/checkout@v4
2025-07-26T08:25:56.2772429Z with:
2025-07-26T08:25:56.2772847Z   repository: ecologicaleaving/BeachRef
2025-07-26T08:25:56.2773517Z   token: ***
2025-07-26T08:25:56.2773893Z   ssh-strict: true
2025-07-26T08:25:56.2774275Z   ssh-user: git
2025-07-26T08:25:56.2774674Z   persist-credentials: true
2025-07-26T08:25:56.2775113Z   clean: true
2025-07-26T08:25:56.2775504Z   sparse-checkout-cone-mode: true
2025-07-26T08:25:56.2776197Z   fetch-depth: 1
2025-07-26T08:25:56.2776584Z   fetch-tags: false
2025-07-26T08:25:56.2776977Z   show-progress: true
2025-07-26T08:25:56.2777366Z   lfs: false
2025-07-26T08:25:56.2777731Z   submodules: false
2025-07-26T08:25:56.2778128Z   set-safe-directory: true
2025-07-26T08:25:56.2778816Z ##[endgroup]
2025-07-26T08:25:56.4500734Z Syncing repository: ecologicaleaving/BeachRef
2025-07-26T08:25:56.4502522Z ##[group]Getting Git version info
2025-07-26T08:25:56.4503420Z Working directory is '/home/runner/work/BeachRef/BeachRef'
2025-07-26T08:25:56.4504396Z [command]/usr/bin/git version
2025-07-26T08:25:56.4550781Z git version 2.50.1
2025-07-26T08:25:56.4578954Z ##[endgroup]
2025-07-26T08:25:56.4601577Z Temporarily overriding HOME='/home/runner/work/_temp/5b575abb-c924-4067-a8e1-e205fdcf13f6' before making global git config changes
2025-07-26T08:25:56.4603954Z Adding repository directory to the temporary git global config as a safe directory
2025-07-26T08:25:56.4608224Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/BeachRef/BeachRef
2025-07-26T08:25:56.4642126Z Deleting the contents of '/home/runner/work/BeachRef/BeachRef'
2025-07-26T08:25:56.4646290Z ##[group]Initializing the repository
2025-07-26T08:25:56.4651211Z [command]/usr/bin/git init /home/runner/work/BeachRef/BeachRef
2025-07-26T08:25:56.4709643Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-07-26T08:25:56.4711255Z hint: is subject to change. To configure the initial branch name to use in all
2025-07-26T08:25:56.4712797Z hint: of your new repositories, which will suppress this warning, call:
2025-07-26T08:25:56.4713938Z hint:
2025-07-26T08:25:56.4714662Z hint: 	git config --global init.defaultBranch <name>
2025-07-26T08:25:56.4715577Z hint:
2025-07-26T08:25:56.4716396Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-07-26T08:25:56.4717295Z hint: 'development'. The just-created branch can be renamed via this command:
2025-07-26T08:25:56.4717987Z hint:
2025-07-26T08:25:56.4718361Z hint: 	git branch -m <name>
2025-07-26T08:25:56.4718811Z hint:
2025-07-26T08:25:56.4719408Z hint: Disable this message with "git config set advice.defaultBranchName false"
2025-07-26T08:25:56.4720345Z Initialized empty Git repository in /home/runner/work/BeachRef/BeachRef/.git/
2025-07-26T08:25:56.4730394Z [command]/usr/bin/git remote add origin https://github.com/ecologicaleaving/BeachRef
2025-07-26T08:25:56.4765491Z ##[endgroup]
2025-07-26T08:25:56.4766490Z ##[group]Disabling automatic garbage collection
2025-07-26T08:25:56.4771154Z [command]/usr/bin/git config --local gc.auto 0
2025-07-26T08:25:56.4800987Z ##[endgroup]
2025-07-26T08:25:56.4801650Z ##[group]Setting up auth
2025-07-26T08:25:56.4808025Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-26T08:25:56.4838999Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-26T08:25:56.5115388Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-26T08:25:56.5145540Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-26T08:25:56.5373647Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-07-26T08:25:56.5418438Z ##[endgroup]
2025-07-26T08:25:56.5419723Z ##[group]Fetching the repository
2025-07-26T08:25:56.5427824Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +fd5edb3b07b630b26ea6d4aaf9433d483ae104fb:refs/remotes/origin/master
2025-07-26T08:25:56.7491961Z From https://github.com/ecologicaleaving/BeachRef
2025-07-26T08:25:56.7493216Z  * [new ref]         fd5edb3b07b630b26ea6d4aaf9433d483ae104fb -> origin/master
2025-07-26T08:25:56.7523389Z ##[endgroup]
2025-07-26T08:25:56.7524495Z ##[group]Determining the checkout info
2025-07-26T08:25:56.7527428Z ##[endgroup]
2025-07-26T08:25:56.7533380Z [command]/usr/bin/git sparse-checkout disable
2025-07-26T08:25:56.7576049Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-07-26T08:25:56.7606903Z ##[group]Checking out the ref
2025-07-26T08:25:56.7611273Z [command]/usr/bin/git checkout --progress --force -B master refs/remotes/origin/master
2025-07-26T08:25:56.7787533Z Reset branch 'master'
2025-07-26T08:25:56.7789186Z branch 'master' set up to track 'origin/master'.
2025-07-26T08:25:56.7796390Z ##[endgroup]
2025-07-26T08:25:56.7830883Z [command]/usr/bin/git log -1 --format=%H
2025-07-26T08:25:56.7852539Z fd5edb3b07b630b26ea6d4aaf9433d483ae104fb
2025-07-26T08:25:56.8323956Z ##[group]Run subosito/flutter-action@v2
2025-07-26T08:25:56.8325077Z with:
2025-07-26T08:25:56.8326004Z   flutter-version: 3.24.0
2025-07-26T08:25:56.8326885Z   channel: stable
2025-07-26T08:25:56.8327675Z   architecture: X64
2025-07-26T08:25:56.8328458Z   cache: false
2025-07-26T08:25:56.8329239Z   pub-cache-path: default
2025-07-26T08:25:56.8330120Z   dry-run: false
2025-07-26T08:25:56.8331084Z   git-source: https://github.com/flutter/flutter.git
2025-07-26T08:25:56.8332461Z ##[endgroup]
2025-07-26T08:25:56.8455469Z ##[group]Run chmod +x "$GITHUB_ACTION_PATH/setup.sh"
2025-07-26T08:25:56.8456989Z [36;1mchmod +x "$GITHUB_ACTION_PATH/setup.sh"[0m
2025-07-26T08:25:56.8490655Z shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}
2025-07-26T08:25:56.8491907Z ##[endgroup]
2025-07-26T08:25:56.8643621Z ##[group]Run $GITHUB_ACTION_PATH/setup.sh -p \
2025-07-26T08:25:56.8644885Z [36;1m$GITHUB_ACTION_PATH/setup.sh -p \[0m
2025-07-26T08:25:56.8646171Z [36;1m  -n '3.24.0' \[0m
2025-07-26T08:25:56.8647020Z [36;1m  -f '' \[0m
2025-07-26T08:25:56.8647793Z [36;1m  -a 'X64' \[0m
2025-07-26T08:25:56.8648542Z [36;1m  -k '' \[0m
2025-07-26T08:25:56.8649249Z [36;1m  -c '' \[0m
2025-07-26T08:25:56.8711749Z [36;1m  -l '' \[0m
2025-07-26T08:25:56.8713352Z [36;1m  -d 'default' \[0m
2025-07-26T08:25:56.8715538Z [36;1m  -g 'https://github.com/flutter/flutter.git' \[0m
2025-07-26T08:25:56.8717756Z [36;1m  stable[0m
2025-07-26T08:25:56.8748189Z shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}
2025-07-26T08:25:56.8749409Z ##[endgroup]
2025-07-26T08:25:57.0710872Z ##[group]Run $GITHUB_ACTION_PATH/setup.sh \
2025-07-26T08:25:57.0711993Z [36;1m$GITHUB_ACTION_PATH/setup.sh \[0m
2025-07-26T08:25:57.0712970Z [36;1m  -n '3.24.0' \[0m
2025-07-26T08:25:57.0713768Z [36;1m  -a 'x64' \[0m
2025-07-26T08:25:57.0714800Z [36;1m  -c '/opt/hostedtoolcache/flutter/stable-3.24.0-x64' \[0m
2025-07-26T08:25:57.0716355Z [36;1m  -d '/home/runner/.pub-cache' \[0m
2025-07-26T08:25:57.0717353Z [36;1m  stable[0m
2025-07-26T08:25:57.0746682Z shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}
2025-07-26T08:25:57.0747890Z ##[endgroup]
2025-07-26T08:25:57.2293805Z   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
2025-07-26T08:25:57.2294897Z                                  Dload  Upload   Total   Spent    Left  Speed
2025-07-26T08:25:57.2295352Z 
2025-07-26T08:25:57.6524167Z   0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
2025-07-26T08:25:58.6522281Z  12  639M   12 79.8M    0     0   188M      0  0:00:03 --:--:--  0:00:03  188M
2025-07-26T08:25:59.3767866Z  64  639M   64  410M    0     0   288M      0  0:00:02  0:00:01  0:00:01  288M
2025-07-26T08:25:59.3768788Z 100  639M  100  639M    0     0   297M      0  0:00:02  0:00:02 --:--:--  297M
2025-07-26T08:26:24.8475543Z ##[group]Run flutter pub get
2025-07-26T08:26:24.8476104Z [36;1mflutter pub get[0m
2025-07-26T08:26:24.8508001Z shell: /usr/bin/bash -e {0}
2025-07-26T08:26:24.8508249Z env:
2025-07-26T08:26:24.8508532Z   FLUTTER_ROOT: /opt/hostedtoolcache/flutter/stable-3.24.0-x64
2025-07-26T08:26:24.8508886Z   PUB_CACHE: /home/runner/.pub-cache
2025-07-26T08:26:24.8509155Z ##[endgroup]
2025-07-26T08:26:25.3285240Z 
2025-07-26T08:26:25.3297754Z   ╔════════════════════════════════════════════════════════════════════════════╗
2025-07-26T08:26:25.3298790Z   ║                 Welcome to Flutter! - https://flutter.dev                  ║
2025-07-26T08:26:25.3299550Z   ║                                                                            ║
2025-07-26T08:26:25.3300338Z   ║ The Flutter tool uses Google Analytics to anonymously report feature usage ║
2025-07-26T08:26:25.3301255Z   ║ statistics and basic crash reports. This data is used to help improve      ║
2025-07-26T08:26:25.3302233Z   ║ Flutter tools over time.                                                   ║
2025-07-26T08:26:25.3302965Z   ║                                                                            ║
2025-07-26T08:26:25.3303774Z   ║ Flutter tool analytics are not sent on the very first run. To disable      ║
2025-07-26T08:26:25.3304894Z   ║ reporting, type 'flutter config --no-analytics'. To display the current    ║
2025-07-26T08:26:25.3306161Z   ║ setting, type 'flutter config'. If you opt out of analytics, an opt-out    ║
2025-07-26T08:26:25.3307224Z   ║ event will be sent, and then no further information will be sent by the    ║
2025-07-26T08:26:25.3308808Z   ║ Flutter tool.                                                              ║
2025-07-26T08:26:25.3309966Z   ║                                                                            ║
2025-07-26T08:26:25.3310860Z   ║ By downloading the Flutter SDK, you agree to the Google Terms of Service.  ║
2025-07-26T08:26:25.3311895Z   ║ The Google Privacy Policy describes how data is handled in this service.   ║
2025-07-26T08:26:25.3312703Z   ║                                                                            ║
2025-07-26T08:26:25.3313506Z   ║ Moreover, Flutter includes the Dart SDK, which may send usage metrics and  ║
2025-07-26T08:26:25.3314450Z   ║ crash reports to Google.                                                   ║
2025-07-26T08:26:25.3315210Z   ║                                                                            ║
2025-07-26T08:26:25.3316256Z   ║ Read about data we send with crash reports:                                ║
2025-07-26T08:26:25.3317260Z   ║ https://flutter.dev/to/crash-reporting                                     ║
2025-07-26T08:26:25.3318231Z   ║                                                                            ║
2025-07-26T08:26:25.3319009Z   ║ See Google's privacy policy:                                               ║
2025-07-26T08:26:25.3320003Z   ║ https://policies.google.com/privacy                                        ║
2025-07-26T08:26:25.3320859Z   ║                                                                            ║
2025-07-26T08:26:25.3321685Z   ║ To disable animations in this tool, use                                    ║
2025-07-26T08:26:25.3322653Z   ║ 'flutter config --no-cli-animations'.                                      ║
2025-07-26T08:26:25.3323607Z   ╚════════════════════════════════════════════════════════════════════════════╝
2025-07-26T08:26:25.3324014Z 
2025-07-26T08:26:30.4890277Z Resolving dependencies...
2025-07-26T08:26:31.7859702Z Downloading packages...
2025-07-26T08:26:35.9113984Z < _fe_analyzer_shared 72.0.0 (was 85.0.0) (86.0.0 available)
2025-07-26T08:26:35.9114655Z + _macros 0.3.2 from sdk dart
2025-07-26T08:26:35.9115057Z < analyzer 6.7.0 (was 7.7.1) (8.0.0 available)
2025-07-26T08:26:35.9115490Z < async 2.11.0 (was 2.12.0) (2.13.0 available)
2025-07-26T08:26:35.9116096Z   bloc 8.1.4 (9.0.0 available)
2025-07-26T08:26:35.9116464Z   bloc_test 9.1.7 (10.0.0 available)
2025-07-26T08:26:35.9117265Z < boolean_selector 2.1.1 (was 2.1.2) (2.1.2 available)
2025-07-26T08:26:35.9117774Z < build 2.4.1 (was 3.0.0) (3.0.0 available)
2025-07-26T08:26:35.9118214Z < build_config 1.1.1 (was 1.1.2) (1.1.2 available)
2025-07-26T08:26:35.9118713Z < build_daemon 4.0.2 (was 4.0.4) (4.0.4 available)
2025-07-26T08:26:35.9119220Z < build_resolvers 2.4.2 (was 3.0.0) (3.0.0 available)
2025-07-26T08:26:35.9119718Z < build_runner 2.4.13 (was 2.6.0) (2.6.0 available)
2025-07-26T08:26:35.9120234Z < build_runner_core 7.3.2 (was 9.2.0) (9.2.0 available)
2025-07-26T08:26:35.9120783Z < characters 1.3.0 (was 1.4.0) (1.4.1 available)
2025-07-26T08:26:35.9121245Z   checked_yaml 2.0.3 (2.0.4 available)
2025-07-26T08:26:35.9121657Z < clock 1.1.1 (was 1.1.2) (1.1.2 available)
2025-07-26T08:26:35.9122081Z < collection 1.18.0 (was 1.19.1) (1.19.1 available)
2025-07-26T08:26:35.9122541Z   connectivity_plus 5.0.2 (6.1.4 available)
2025-07-26T08:26:35.9123073Z   connectivity_plus_platform_interface 1.2.4 (2.0.1 available)
2025-07-26T08:26:35.9123620Z < dart_style 2.3.7 (was 3.1.1) (3.1.1 available)
2025-07-26T08:26:35.9124063Z < fake_async 1.3.1 (was 1.3.2) (1.3.3 available)
2025-07-26T08:26:35.9124488Z < ffi 2.1.3 (was 2.1.4) (2.1.4 available)
2025-07-26T08:26:35.9124883Z < file 7.0.0 (was 7.0.1) (7.0.1 available)
2025-07-26T08:26:35.9125292Z   flutter_bloc 8.1.6 (9.1.1 available)
2025-07-26T08:26:35.9125886Z   flutter_lints 3.0.2 (6.0.0 available)
2025-07-26T08:26:35.9126354Z   flutter_secure_storage_linux 1.2.3 (2.0.1 available)
2025-07-26T08:26:35.9126881Z   flutter_secure_storage_macos 3.1.3 (4.0.0 available)
2025-07-26T08:26:35.9127490Z   flutter_secure_storage_platform_interface 1.1.2 (2.0.1 available)
2025-07-26T08:26:35.9128326Z   flutter_secure_storage_web 1.2.1 (2.0.0 available)
2025-07-26T08:26:35.9128806Z   flutter_secure_storage_windows 3.1.2 (4.0.0 available)
2025-07-26T08:26:35.9129277Z   go_router 12.1.3 (16.0.0 available)
2025-07-26T08:26:35.9129740Z < http_parser 4.0.2 (was 4.1.2) (4.1.2 available)
2025-07-26T08:26:35.9130199Z   js 0.6.7 (0.7.2 available)
2025-07-26T08:26:35.9130594Z < leak_tracker 10.0.5 (was 10.0.8) (11.0.1 available)
2025-07-26T08:26:35.9131171Z < leak_tracker_flutter_testing 3.0.5 (was 3.0.9) (3.0.10 available)
2025-07-26T08:26:35.9131744Z   leak_tracker_testing 3.0.1 (3.0.2 available)
2025-07-26T08:26:35.9132199Z   lints 3.0.0 (6.0.0 available)
2025-07-26T08:26:35.9132610Z + macros 0.1.2-main.4 (0.1.3-main.0 available)
2025-07-26T08:26:35.9133103Z < matcher 0.12.16+1 (was 0.12.17) (0.12.17 available)
2025-07-26T08:26:35.9133629Z   material_color_utilities 0.11.1 (0.13.0 available)
2025-07-26T08:26:35.9134105Z < meta 1.15.0 (was 1.16.0) (1.17.0 available)
2025-07-26T08:26:35.9134569Z < mockito 5.4.4 (was 5.5.0) (5.5.0 available)
2025-07-26T08:26:35.9135000Z < path 1.9.0 (was 1.9.1) (1.9.1 available)
2025-07-26T08:26:35.9135539Z < path_provider_android 2.2.15 (was 2.2.17) (2.2.17 available)
2025-07-26T08:26:35.9136317Z < petitparser 6.0.2 (was 6.1.0) (7.0.0 available)
2025-07-26T08:26:35.9136828Z < platform 3.1.5 (was 3.1.6) (3.1.6 available)
2025-07-26T08:26:35.9137307Z < process 5.0.2 (was 5.0.3) (5.0.4 available)
2025-07-26T08:26:35.9137788Z < pubspec_parse 1.4.0 (was 1.5.0) (1.5.0 available)
2025-07-26T08:26:35.9138395Z < shared_preferences_android 2.4.7 (was 2.4.10) (2.4.10 available)
2025-07-26T08:26:35.9138953Z < shelf 1.4.1 (was 1.4.2) (1.4.2 available)
2025-07-26T08:26:35.9139431Z < shelf_web_socket 2.0.1 (was 3.0.0) (3.0.0 available)
2025-07-26T08:26:35.9140006Z > sky_engine 0.0.99 from sdk flutter (was 0.0.0 from sdk flutter)
2025-07-26T08:26:35.9140576Z < source_gen 1.5.0 (was 3.0.0) (3.0.0 available)
2025-07-26T08:26:35.9141075Z < source_span 1.10.0 (was 1.10.1) (1.10.1 available)
2025-07-26T08:26:35.9141558Z < sqflite 2.4.1 (was 2.4.2) (2.4.2 available)
2025-07-26T08:26:35.9142052Z < sqflite_android 2.4.0 (was 2.4.1) (2.4.1 available)
2025-07-26T08:26:35.9142568Z < sqflite_common 2.5.4+6 (was 2.5.5) (2.5.5 available)
2025-07-26T08:26:35.9143344Z < sqflite_darwin 2.4.1+1 (was 2.4.2) (2.4.2 available)
2025-07-26T08:26:35.9143870Z < stack_trace 1.11.1 (was 1.12.1) (1.12.1 available)
2025-07-26T08:26:35.9144377Z < stream_channel 2.1.2 (was 2.1.4) (2.1.4 available)
2025-07-26T08:26:35.9144897Z < string_scanner 1.2.0 (was 1.4.1) (1.4.1 available)
2025-07-26T08:26:35.9145422Z < synchronized 3.3.0+3 (was 3.3.1) (3.4.0 available)
2025-07-26T08:26:35.9146110Z < term_glyph 1.2.1 (was 1.2.2) (1.2.2 available)
2025-07-26T08:26:35.9146609Z < test 1.25.7 (was 1.25.15) (1.26.3 available)
2025-07-26T08:26:35.9147054Z < test_api 0.7.2 (was 0.7.4) (0.7.7 available)
2025-07-26T08:26:35.9147529Z < test_core 0.6.4 (was 0.6.8) (0.6.12 available)
2025-07-26T08:26:35.9148053Z < url_launcher 6.3.1 (was 6.3.2) (6.3.2 available)
2025-07-26T08:26:35.9148615Z < url_launcher_android 6.3.14 (was 6.3.16) (6.3.16 available)
2025-07-26T08:26:35.9149169Z < url_launcher_web 2.3.3 (was 2.4.1) (2.4.1 available)
2025-07-26T08:26:35.9149652Z   vector_math 2.1.4 (2.2.0 available)
2025-07-26T08:26:35.9150093Z < vm_service 14.2.4 (was 14.3.1) (15.0.2 available)
2025-07-26T08:26:35.9150569Z < webdriver 3.0.3 (was 3.0.4) (3.1.0 available)
2025-07-26T08:26:35.9151009Z < win32 5.10.1 (was 5.13.0) (5.14.0 available)
2025-07-26T08:26:35.9151417Z   xml 6.5.0 (6.6.0 available)
2025-07-26T08:26:35.9151815Z Changed 55 dependencies!
2025-07-26T08:26:35.9152345Z 72 packages have newer versions incompatible with dependency constraints.
2025-07-26T08:26:35.9153017Z Try `flutter pub outdated` for more information.
2025-07-26T08:26:36.4647024Z ##[group]Run flutter packages pub run build_runner build --delete-conflicting-outputs
2025-07-26T08:26:36.4647617Z [36;1mflutter packages pub run build_runner build --delete-conflicting-outputs[0m
2025-07-26T08:26:36.4677253Z shell: /usr/bin/bash -e {0}
2025-07-26T08:26:36.4677507Z env:
2025-07-26T08:26:36.4677765Z   FLUTTER_ROOT: /opt/hostedtoolcache/flutter/stable-3.24.0-x64
2025-07-26T08:26:36.4678114Z   PUB_CACHE: /home/runner/.pub-cache
2025-07-26T08:26:36.4678352Z ##[endgroup]
2025-07-26T08:26:41.6512173Z [INFO] Generating build script...
2025-07-26T08:26:41.9900348Z [INFO] Generating build script completed, took 359ms
2025-07-26T08:26:41.9900674Z 
2025-07-26T08:26:42.0321882Z [INFO] Precompiling build script......
2025-07-26T08:26:46.3609386Z [INFO] Precompiling build script... completed, took 4.3s
2025-07-26T08:26:46.3609776Z 
2025-07-26T08:26:46.9641153Z [INFO] Initializing inputs
2025-07-26T08:26:47.4228782Z [INFO] Building new asset graph...
2025-07-26T08:26:48.6732068Z [INFO] Building new asset graph completed, took 1.2s
2025-07-26T08:26:48.6732556Z 
2025-07-26T08:26:48.6732805Z [INFO] Checking for unexpected pre-existing outputs....
2025-07-26T08:26:48.6741570Z [INFO] Checking for unexpected pre-existing outputs. completed, took 0ms
2025-07-26T08:26:48.6742119Z 
2025-07-26T08:26:48.6826248Z [INFO] Running build...
2025-07-26T08:26:48.7116261Z [INFO] Generating SDK summary...
2025-07-26T08:26:50.7313010Z [INFO] 2.1s elapsed, 0/16 actions completed.
2025-07-26T08:26:52.3946086Z [INFO] 3.7s elapsed, 0/16 actions completed.
2025-07-26T08:26:53.2501260Z [INFO] Generating SDK summary completed, took 4.5s
2025-07-26T08:26:53.2501703Z 
2025-07-26T08:26:54.2837695Z [INFO] 5.6s elapsed, 22/54 actions completed.
2025-07-26T08:26:55.3857297Z [INFO] 6.7s elapsed, 56/82 actions completed.
2025-07-26T08:27:04.1241623Z [INFO] 15.4s elapsed, 88/105 actions completed.
2025-07-26T08:27:05.4324238Z [INFO] 16.8s elapsed, 112/119 actions completed.
2025-07-26T08:27:05.8119007Z [INFO] Running build completed, took 17.1s
2025-07-26T08:27:05.8119493Z 
2025-07-26T08:27:05.8119679Z [INFO] Caching finalized dependency graph...
2025-07-26T08:27:05.8914177Z [INFO] Caching finalized dependency graph completed, took 79ms
2025-07-26T08:27:05.8914661Z 
2025-07-26T08:27:05.8938036Z [INFO] Succeeded after 17.2s with 109 outputs (222 actions)
2025-07-26T08:27:05.8938466Z 
2025-07-26T08:27:06.0274892Z ##[group]Run flutter test
2025-07-26T08:27:06.0275332Z [36;1mflutter test[0m
2025-07-26T08:27:06.0316365Z shell: /usr/bin/bash -e {0}
2025-07-26T08:27:06.0316758Z env:
2025-07-26T08:27:06.0317175Z   FLUTTER_ROOT: /opt/hostedtoolcache/flutter/stable-3.24.0-x64
2025-07-26T08:27:06.0317772Z   PUB_CACHE: /home/runner/.pub-cache
2025-07-26T08:27:06.0318202Z ##[endgroup]
2025-07-26T08:27:07.2936361Z 
2025-07-26T08:27:16.3959204Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget_test.dart: (setUpAll) (failed)
2025-07-26T08:27:16.3962594Z Warning: At least one test in this suite creates an HttpClient. When running a test suite that uses
2025-07-26T08:27:16.3963823Z TestWidgetsFlutterBinding, all HTTP requests will return status code 400, and no network request
2025-07-26T08:27:16.3968024Z will actually be made. Any test expecting a real network connection and status code will fail.
2025-07-26T08:27:16.3969150Z To test code that needs an HttpClient, provide your own HttpClient implementation to the code under
2025-07-26T08:27:16.3970142Z test, so that your test can consistently provide a testable response to the code under test.
2025-07-26T08:27:16.3971283Z MissingPluginException(No implementation found for method getAll on channel plugins.flutter.io/shared_preferences)
2025-07-26T08:27:16.4016859Z dart:async                                                           _Completer.completeError
2025-07-26T08:27:16.4036812Z package:shared_preferences/src/shared_preferences_legacy.dart 91:19  SharedPreferences.getInstance
2025-07-26T08:27:16.4037938Z ===== asynchronous gap ===========================
2025-07-26T08:27:16.4038780Z dart:async                                                           _CustomZone.registerBinaryCallback
2025-07-26T08:27:16.4039721Z package:shared_preferences/src/shared_preferences_legacy.dart 86:13  SharedPreferences.getInstance
2025-07-26T08:27:16.4041351Z package:supabase_flutter/src/local_storage.dart 129:38               SharedPreferencesGotrueAsyncStorage._initialize
2025-07-26T08:27:16.4042504Z package:supabase_flutter/src/local_storage.dart 120:5                new SharedPreferencesGotrueAsyncStorage
2025-07-26T08:27:16.4043523Z package:supabase_flutter/src/supabase.dart 109:27                    Supabase.initialize
2025-07-26T08:27:16.4044418Z test/helpers/test_helper.dart 15:18                                  initializeSupabaseForTesting
2025-07-26T08:27:16.4045194Z test/widget_test.dart 16:11                                          main.<fn>
2025-07-26T08:27:16.4046406Z MissingPluginException(No implementation found for method getAll on channel plugins.flutter.io/shared_preferences)
2025-07-26T08:27:16.4047371Z dart:async                                                           _Completer.completeError
2025-07-26T08:27:16.4048350Z package:shared_preferences/src/shared_preferences_legacy.dart 91:19  SharedPreferences.getInstance
2025-07-26T08:27:16.4049156Z ===== asynchronous gap ===========================
2025-07-26T08:27:16.4049720Z dart:async                                                           _CustomZone.registerBinaryCallback
2025-07-26T08:27:16.4050605Z package:shared_preferences/src/shared_preferences_legacy.dart 86:13  SharedPreferences.getInstance
2025-07-26T08:27:16.4051744Z package:supabase_flutter/src/local_storage.dart 129:38               SharedPreferencesGotrueAsyncStorage._initialize
2025-07-26T08:27:16.4052865Z package:supabase_flutter/src/local_storage.dart 120:5                new SharedPreferencesGotrueAsyncStorage
2025-07-26T08:27:16.4053861Z package:supabase_flutter/src/supabase.dart 109:27                    Supabase.initialize
2025-07-26T08:27:16.4054786Z test/helpers/test_helper.dart 15:18                                  initializeSupabaseForTesting
2025-07-26T08:27:16.4055563Z test/widget_test.dart 16:11                                          main.<fn>
2025-07-26T08:27:16.4056672Z ##[endgroup]
2025-07-26T08:27:16.8753947Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should display loading state initially
2025-07-26T08:27:17.0618135Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/main_test.dart: Main Function Tests BeachRefApp should be instantiable
2025-07-26T08:27:17.8333825Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/constants_test.dart: AppConstants Tests should have correct app metadata
2025-07-26T08:27:17.8368122Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/constants_test.dart: AppConstants Tests should have correct API configuration
2025-07-26T08:27:17.8392262Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/constants_test.dart: AppConstants Tests should have correct UI constants
2025-07-26T08:27:17.8416719Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/constants_test.dart: AppConstants Tests should have correct routes
2025-07-26T08:27:18.0275104Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should display connected status with green indicator (failed)
2025-07-26T08:27:18.0277256Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:18.0287065Z The following assertion was thrown running a test:
2025-07-26T08:27:18.0291249Z pumpAndSettle timed out
2025-07-26T08:27:18.0291476Z 
2025-07-26T08:27:18.0291657Z When the exception was thrown, this was the stack:
2025-07-26T08:27:18.0292480Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:18.0293236Z <asynchronous suspension>
2025-07-26T08:27:18.0293912Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:18.0294651Z <asynchronous suspension>
2025-07-26T08:27:18.0296941Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:80:7)
2025-07-26T08:27:18.0298344Z <asynchronous suspension>
2025-07-26T08:27:18.0299091Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:18.0299892Z <asynchronous suspension>
2025-07-26T08:27:18.0300553Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:18.0301830Z <asynchronous suspension>
2025-07-26T08:27:18.0302181Z <asynchronous suspension>
2025-07-26T08:27:18.0302564Z (elided one frame from package:stack_trace)
2025-07-26T08:27:18.0302872Z 
2025-07-26T08:27:18.0303009Z The test description was:
2025-07-26T08:27:18.0303426Z   should display connected status with green indicator
2025-07-26T08:27:18.0304318Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:18.0305111Z Test failed. See exception logs above.
2025-07-26T08:27:18.0305920Z The test description was: should display connected status with green indicator
2025-07-26T08:27:18.0306401Z 
2025-07-26T08:27:18.0307016Z ##[endgroup]
2025-07-26T08:27:18.4039774Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should display error status with red indicator (failed)
2025-07-26T08:27:18.4042285Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:18.4048232Z The following assertion was thrown running a test:
2025-07-26T08:27:18.4048753Z pumpAndSettle timed out
2025-07-26T08:27:18.4048982Z 
2025-07-26T08:27:18.4049182Z When the exception was thrown, this was the stack:
2025-07-26T08:27:18.4050044Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:18.4050857Z <asynchronous suspension>
2025-07-26T08:27:18.4051550Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:18.4052379Z <asynchronous suspension>
2025-07-26T08:27:18.4053845Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:98:7)
2025-07-26T08:27:18.4054968Z <asynchronous suspension>
2025-07-26T08:27:18.4055896Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:18.4056709Z <asynchronous suspension>
2025-07-26T08:27:18.4057394Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:18.4058167Z <asynchronous suspension>
2025-07-26T08:27:18.4058542Z <asynchronous suspension>
2025-07-26T08:27:18.4058928Z (elided one frame from package:stack_trace)
2025-07-26T08:27:18.4059243Z 
2025-07-26T08:27:18.4059388Z The test description was:
2025-07-26T08:27:18.4059809Z   should display error status with red indicator
2025-07-26T08:27:18.4060740Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:18.4061347Z Test failed. See exception logs above.
2025-07-26T08:27:18.4061954Z The test description was: should display error status with red indicator
2025-07-26T08:27:18.4062430Z 
2025-07-26T08:27:18.4062942Z ##[endgroup]
2025-07-26T08:27:18.4529511Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should display connecting status with animation
2025-07-26T08:27:18.4913570Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/utils_test.dart: AppUtils Tests formatDateTime should format DateTime correctly
2025-07-26T08:27:18.4949100Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/utils_test.dart: AppUtils Tests formatDateTime should pad single digits with zeros
2025-07-26T08:27:18.4983470Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/utils_test.dart: AppUtils Tests isValidEmail should return true for valid emails
2025-07-26T08:27:18.5020205Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/utils_test.dart: AppUtils Tests isValidEmail should return false for invalid emails
2025-07-26T08:27:18.8070416Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should refresh status when refresh button is tapped (failed)
2025-07-26T08:27:18.8076287Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:18.8078828Z The following assertion was thrown running a test:
2025-07-26T08:27:18.8083052Z pumpAndSettle timed out
2025-07-26T08:27:18.8085005Z 
2025-07-26T08:27:18.8085222Z When the exception was thrown, this was the stack:
2025-07-26T08:27:18.8087468Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:18.8089148Z <asynchronous suspension>
2025-07-26T08:27:18.8089826Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:18.8090590Z <asynchronous suspension>
2025-07-26T08:27:18.8091561Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:136:7)
2025-07-26T08:27:18.8092552Z <asynchronous suspension>
2025-07-26T08:27:18.8093249Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:18.8094007Z <asynchronous suspension>
2025-07-26T08:27:18.8094644Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:18.8095335Z <asynchronous suspension>
2025-07-26T08:27:18.8095830Z <asynchronous suspension>
2025-07-26T08:27:18.8096206Z (elided one frame from package:stack_trace)
2025-07-26T08:27:18.8096505Z 
2025-07-26T08:27:18.8096629Z The test description was:
2025-07-26T08:27:18.8097023Z   should refresh status when refresh button is tapped
2025-07-26T08:27:18.8097865Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:18.8098768Z Test failed. See exception logs above.
2025-07-26T08:27:18.8099376Z The test description was: should refresh status when refresh button is tapped
2025-07-26T08:27:18.8099845Z 
2025-07-26T08:27:18.8100246Z ##[endgroup]
2025-07-26T08:27:19.0832526Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should expand error details when tapped (failed)
2025-07-26T08:27:19.0834465Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:19.0835268Z The following assertion was thrown running a test:
2025-07-26T08:27:19.0836001Z pumpAndSettle timed out
2025-07-26T08:27:19.0836246Z 
2025-07-26T08:27:19.0836455Z When the exception was thrown, this was the stack:
2025-07-26T08:27:19.0837322Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:19.0838687Z <asynchronous suspension>
2025-07-26T08:27:19.0839414Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:19.0840213Z <asynchronous suspension>
2025-07-26T08:27:19.0841233Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:157:7)
2025-07-26T08:27:19.0842317Z <asynchronous suspension>
2025-07-26T08:27:19.0843075Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:19.0843892Z <asynchronous suspension>
2025-07-26T08:27:19.0844546Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:19.0845285Z <asynchronous suspension>
2025-07-26T08:27:19.0845840Z <asynchronous suspension>
2025-07-26T08:27:19.0846238Z (elided one frame from package:stack_trace)
2025-07-26T08:27:19.0846566Z 
2025-07-26T08:27:19.0846709Z The test description was:
2025-07-26T08:27:19.0847102Z   should expand error details when tapped
2025-07-26T08:27:19.0847924Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:19.0848452Z Test failed. See exception logs above.
2025-07-26T08:27:19.0848983Z The test description was: should expand error details when tapped
2025-07-26T08:27:19.0849398Z 
2025-07-26T08:27:19.0849968Z ##[endgroup]
2025-07-26T08:27:19.1423089Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateApiCall should allow valid API call
2025-07-26T08:27:19.1424732Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:19.1427348Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:19.1428266Z   CorrelationId: corr_1753518439127_1
2025-07-26T08:27:19.1429378Z ##[endgroup]
2025-07-26T08:27:19.1459825Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateApiCall should reject invalid endpoint
2025-07-26T08:27:19.1513009Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateApiCall should enforce rate limiting between calls
2025-07-26T08:27:19.1514807Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:19.1515511Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:19.1516249Z   CorrelationId: corr_1753518439147_3
2025-07-26T08:27:19.1516716Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1517492Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":100,"totalApiCalls":1}
2025-07-26T08:27:19.1518391Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:19.1519140Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":0}
2025-07-26T08:27:19.1519727Z   CorrelationId: corr_1753518439149_4
2025-07-26T08:27:19.1520367Z ##[endgroup]
2025-07-26T08:27:19.1599135Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateTournamentData should validate complete tournament data
2025-07-26T08:27:19.1620512Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateTournamentData should reject tournament data with missing required fields
2025-07-26T08:27:19.1642728Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateTournamentData should reject tournament with invalid VIS ID
2025-07-26T08:27:19.1672870Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateTournamentData should reject tournament with invalid date format
2025-07-26T08:27:19.1699419Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests validateTournamentData should reject tournament with invalid competition level
2025-07-26T08:27:19.1748836Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests recordApiCall should record API call correctly
2025-07-26T08:27:19.1751172Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1760349Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":150,"totalApiCalls":1}
2025-07-26T08:27:19.1762018Z ##[endgroup]
2025-07-26T08:27:19.1799142Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests recordApiCall should track multiple API calls
2025-07-26T08:27:19.1805270Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1810045Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":150,"totalApiCalls":1}
2025-07-26T08:27:19.1810908Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1811670Z   Data: {"endpoint":"/matches","method":"GET","statusCode":200,"responseTimeMs":200,"totalApiCalls":2}
2025-07-26T08:27:19.1812638Z ##[endgroup]
2025-07-26T08:27:19.1869748Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests generateUsageReport should generate basic usage report
2025-07-26T08:27:19.1872002Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1872814Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":150,"totalApiCalls":1}
2025-07-26T08:27:19.1873806Z ##[endgroup]
2025-07-26T08:27:19.1934409Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests generateUsageReport should generate report for date range
2025-07-26T08:27:19.1936407Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1937213Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":150,"totalApiCalls":1}
2025-07-26T08:27:19.1938321Z ##[endgroup]
2025-07-26T08:27:19.1960185Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests getComplianceStats should return compliance statistics
2025-07-26T08:27:19.1991816Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests getComplianceStats should track rate limit status correctly
2025-07-26T08:27:19.1993530Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.1994291Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":150,"totalApiCalls":1}
2025-07-26T08:27:19.1995317Z ##[endgroup]
2025-07-26T08:27:19.2023493Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/core/compliance/fivb_compliance_validator_test.dart: FIVBComplianceValidator Tests clearHistory should clear all compliance history
2025-07-26T08:27:19.2025241Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:19.2026633Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":150,"totalApiCalls":1}
2025-07-26T08:27:19.2027800Z ##[endgroup]
2025-07-26T08:27:19.4714594Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should handle responsive layout for mobile (failed)
2025-07-26T08:27:19.4719655Z ══╡ EXCEPTION CAUGHT BY RENDERING LIBRARY ╞═════════════════════════════════════════════════════════
2025-07-26T08:27:19.4720645Z The following assertion was thrown during layout:
2025-07-26T08:27:19.4721831Z A RenderFlex overflowed by 61 pixels on the right.
2025-07-26T08:27:19.4722203Z 
2025-07-26T08:27:19.4722385Z The relevant error-causing widget was:
2025-07-26T08:27:19.4722758Z   Row
2025-07-26T08:27:19.4723434Z   Row:file:///home/runner/work/BeachRef/BeachRef/lib/presentation/widgets/health_status_widget.dart:124:12
2025-07-26T08:27:19.4724113Z 
2025-07-26T08:27:19.4724393Z The overflowing RenderFlex has an orientation of Axis.horizontal.
2025-07-26T08:27:19.4725201Z The edge of the RenderFlex that is overflowing has been marked in the rendering with a yellow and
2025-07-26T08:27:19.4726342Z black striped pattern. This is usually caused by the contents being too big for the RenderFlex.
2025-07-26T08:27:19.4727258Z Consider applying a flex factor (e.g. using an Expanded widget) to force the children of the
2025-07-26T08:27:19.4728157Z RenderFlex to fit within the available space instead of being sized to their natural size.
2025-07-26T08:27:19.4729067Z This is considered an error condition because it indicates that there is content that cannot be
2025-07-26T08:27:19.4730063Z seen. If the content is legitimately bigger than the available space, consider clipping it with a
2025-07-26T08:27:19.4730785Z ClipRect widget before putting it in the flex, or using a scrollable container rather than a Flex,
2025-07-26T08:27:19.4757015Z like a ListView.
2025-07-26T08:27:19.4757589Z The specific RenderFlex in question is: RenderFlex#6c332 relayoutBoundary=up10 OVERFLOWING:
2025-07-26T08:27:19.4758619Z   creator: Row ← Column ← Padding ← Semantics ← DefaultTextStyle ← AnimatedDefaultTextStyle ←
2025-07-26T08:27:19.4759646Z     _InkFeatures-[GlobalKey#37920 ink renderer] ← NotificationListener<LayoutChangedNotification> ←
2025-07-26T08:27:19.4760606Z     CustomPaint ← _ShapeBorderPaint ← PhysicalShape ← _MaterialInterior ← ⋯
2025-07-26T08:27:19.4761297Z   parentData: offset=Offset(0.0, 0.0); flex=null; fit=null (can use size)
2025-07-26T08:27:19.4761894Z   constraints: BoxConstraints(0.0<=w<=276.0, 0.0<=h<=Infinity)
2025-07-26T08:27:19.4762395Z   size: Size(276.0, 40.0)
2025-07-26T08:27:19.4762697Z   direction: horizontal
2025-07-26T08:27:19.4763305Z   mainAxisAlignment: spaceBetween
2025-07-26T08:27:19.4763718Z   mainAxisSize: max
2025-07-26T08:27:19.4764006Z   crossAxisAlignment: center
2025-07-26T08:27:19.4764338Z   textDirection: ltr
2025-07-26T08:27:19.4764610Z   verticalDirection: down
2025-07-26T08:27:19.4765258Z ◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤
2025-07-26T08:27:19.4766236Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:19.4767141Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:19.4767833Z The following assertion was thrown running a test:
2025-07-26T08:27:19.4768293Z pumpAndSettle timed out
2025-07-26T08:27:19.4768495Z 
2025-07-26T08:27:19.4768690Z When the exception was thrown, this was the stack:
2025-07-26T08:27:19.4769737Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:19.4770487Z <asynchronous suspension>
2025-07-26T08:27:19.4771133Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:19.4771878Z <asynchronous suspension>
2025-07-26T08:27:19.4772832Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:181:7)
2025-07-26T08:27:19.4773793Z <asynchronous suspension>
2025-07-26T08:27:19.4774520Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:19.4775241Z <asynchronous suspension>
2025-07-26T08:27:19.4776073Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:19.4776781Z <asynchronous suspension>
2025-07-26T08:27:19.4777155Z <asynchronous suspension>
2025-07-26T08:27:19.4777547Z (elided one frame from package:stack_trace)
2025-07-26T08:27:19.4777841Z 
2025-07-26T08:27:19.4777970Z The test description was:
2025-07-26T08:27:19.4778308Z   should handle responsive layout for mobile
2025-07-26T08:27:19.4779093Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:19.4780024Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:19.4780735Z The following message was thrown:
2025-07-26T08:27:19.4781397Z Multiple exceptions (2) were detected during the running of the current test, and at least one was
2025-07-26T08:27:19.4782089Z unexpected.
2025-07-26T08:27:19.4782725Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:19.4783255Z Test failed. See exception logs above.
2025-07-26T08:27:19.4783768Z The test description was: should handle responsive layout for mobile
2025-07-26T08:27:19.4784214Z 
2025-07-26T08:27:19.4784700Z ##[endgroup]
2025-07-26T08:27:19.8409400Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should handle responsive layout for desktop (failed)
2025-07-26T08:27:19.8411659Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:19.8413347Z The following assertion was thrown running a test:
2025-07-26T08:27:19.8413840Z pumpAndSettle timed out
2025-07-26T08:27:19.8414058Z 
2025-07-26T08:27:19.8414252Z When the exception was thrown, this was the stack:
2025-07-26T08:27:19.8415094Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:19.8416064Z <asynchronous suspension>
2025-07-26T08:27:19.8416763Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:19.8417543Z <asynchronous suspension>
2025-07-26T08:27:19.8418532Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:203:7)
2025-07-26T08:27:19.8419561Z <asynchronous suspension>
2025-07-26T08:27:19.8420277Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:19.8421065Z <asynchronous suspension>
2025-07-26T08:27:19.8421712Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:19.8422430Z <asynchronous suspension>
2025-07-26T08:27:19.8422781Z <asynchronous suspension>
2025-07-26T08:27:19.8423161Z (elided one frame from package:stack_trace)
2025-07-26T08:27:19.8423464Z 
2025-07-26T08:27:19.8423605Z The test description was:
2025-07-26T08:27:19.8423980Z   should handle responsive layout for desktop
2025-07-26T08:27:19.8424816Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:19.8425628Z Test failed. See exception logs above.
2025-07-26T08:27:19.8426426Z The test description was: should handle responsive layout for desktop
2025-07-26T08:27:19.8426878Z 
2025-07-26T08:27:19.8427359Z ##[endgroup]
2025-07-26T08:27:20.0633241Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc initial state is AuthenticationInitial
2025-07-26T08:27:20.1168157Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc AppStarted emits [AuthenticationAuthenticated] when valid session exists (failed)
2025-07-26T08:27:20.1172176Z MissingDummyValueError: Result<Session, AuthError>
2025-07-26T08:27:20.1172746Z 
2025-07-26T08:27:20.1173130Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.1174270Z 'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.1175132Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.1175473Z 
2025-07-26T08:27:20.1176014Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.1176921Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.1177530Z all the called methods.
2025-07-26T08:27:20.1177756Z 
2025-07-26T08:27:20.1181797Z package:mockito/src/dummies.dart 156:3                                   dummyValue
2025-07-26T08:27:20.1183191Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 145:17  MockSessionManager.getCurrentSession
2025-07-26T08:27:20.1185240Z test/unit/presentation/blocs/authentication_bloc_test.dart 74:35         main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.1188197Z package:bloc_test/src/bloc_test.dart 203:25                              testBloc.<fn>
2025-07-26T08:27:20.1190809Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1196767Z dart:async                                                               _Completer.completeError
2025-07-26T08:27:20.1198018Z package:bloc_test/src/bloc_test.dart 257:43                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.1198768Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1199368Z dart:async                                                               _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.1200152Z package:bloc_test/src/bloc_test.dart 254:5                               _runZonedGuarded.<fn>
2025-07-26T08:27:20.1200895Z dart:async                                                               runZonedGuarded
2025-07-26T08:27:20.1201618Z package:bloc_test/src/bloc_test.dart 253:3                               _runZonedGuarded
2025-07-26T08:27:20.1204113Z package:bloc_test/src/bloc_test.dart 200:11                              testBloc
2025-07-26T08:27:20.1204936Z package:bloc_test/src/bloc_test.dart 156:13                              blocTest.<fn>
2025-07-26T08:27:20.1206357Z ##[endgroup]
2025-07-26T08:27:20.1385515Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc AppStarted emits [AuthenticationUnauthenticated] when no session exists (failed)
2025-07-26T08:27:20.1396464Z MissingDummyValueError: Result<Session, AuthError>
2025-07-26T08:27:20.1397405Z 
2025-07-26T08:27:20.1397818Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.1398882Z 'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.1399934Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.1400408Z 
2025-07-26T08:27:20.1400921Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.1402960Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.1403785Z all the called methods.
2025-07-26T08:27:20.1404174Z 
2025-07-26T08:27:20.1404642Z package:mockito/src/dummies.dart 156:3                                   dummyValue
2025-07-26T08:27:20.1406158Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 145:17  MockSessionManager.getCurrentSession
2025-07-26T08:27:20.1410044Z test/unit/presentation/blocs/authentication_bloc_test.dart 93:35         main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.1413280Z package:bloc_test/src/bloc_test.dart 203:25                              testBloc.<fn>
2025-07-26T08:27:20.1413902Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1414439Z dart:async                                                               _Completer.completeError
2025-07-26T08:27:20.1415154Z package:bloc_test/src/bloc_test.dart 257:43                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.1415982Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1416518Z dart:async                                                               _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.1417244Z package:bloc_test/src/bloc_test.dart 254:5                               _runZonedGuarded.<fn>
2025-07-26T08:27:20.1417998Z dart:async                                                               runZonedGuarded
2025-07-26T08:27:20.1418690Z package:bloc_test/src/bloc_test.dart 253:3                               _runZonedGuarded
2025-07-26T08:27:20.1419511Z package:bloc_test/src/bloc_test.dart 200:11                              testBloc
2025-07-26T08:27:20.1420337Z package:bloc_test/src/bloc_test.dart 156:13                              blocTest.<fn>
2025-07-26T08:27:20.1421289Z ##[endgroup]
2025-07-26T08:27:20.1437421Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should format time correctly (failed)
2025-07-26T08:27:20.1443885Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:20.1448730Z The following assertion was thrown running a test:
2025-07-26T08:27:20.1452858Z pumpAndSettle timed out
2025-07-26T08:27:20.1453695Z 
2025-07-26T08:27:20.1454915Z When the exception was thrown, this was the stack:
2025-07-26T08:27:20.1457056Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:20.1457782Z <asynchronous suspension>
2025-07-26T08:27:20.1458416Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:20.1459132Z <asynchronous suspension>
2025-07-26T08:27:20.1460123Z #2      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:225:7)
2025-07-26T08:27:20.1461115Z <asynchronous suspension>
2025-07-26T08:27:20.1461838Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:20.1462682Z <asynchronous suspension>
2025-07-26T08:27:20.1463302Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:20.1464331Z <asynchronous suspension>
2025-07-26T08:27:20.1464696Z <asynchronous suspension>
2025-07-26T08:27:20.1467716Z (elided one frame from package:stack_trace)
2025-07-26T08:27:20.1467984Z 
2025-07-26T08:27:20.1468104Z The test description was:
2025-07-26T08:27:20.1468440Z   should format time correctly
2025-07-26T08:27:20.1469134Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:20.1469615Z Test failed. See exception logs above.
2025-07-26T08:27:20.1470047Z The test description was: should format time correctly
2025-07-26T08:27:20.1470383Z 
2025-07-26T08:27:20.1470774Z ##[endgroup]
2025-07-26T08:27:20.1558845Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc AppStarted emits [AuthenticationUnauthenticated] when session is invalid (failed)
2025-07-26T08:27:20.1560728Z MissingDummyValueError: Result<Session, AuthError>
2025-07-26T08:27:20.1563404Z 
2025-07-26T08:27:20.1563883Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.1566118Z 'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.1566940Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.1568818Z 
2025-07-26T08:27:20.1569164Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.1569903Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.1570499Z all the called methods.
2025-07-26T08:27:20.1570720Z 
2025-07-26T08:27:20.1571054Z package:mockito/src/dummies.dart 156:3                                   dummyValue
2025-07-26T08:27:20.1572096Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 145:17  MockSessionManager.getCurrentSession
2025-07-26T08:27:20.1573165Z test/unit/presentation/blocs/authentication_bloc_test.dart 110:35        main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.1574398Z package:bloc_test/src/bloc_test.dart 203:25                              testBloc.<fn>
2025-07-26T08:27:20.1575034Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1575567Z dart:async                                                               _Completer.completeError
2025-07-26T08:27:20.1576495Z package:bloc_test/src/bloc_test.dart 257:43                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.1577082Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1577639Z dart:async                                                               _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.1579030Z package:bloc_test/src/bloc_test.dart 254:5                               _runZonedGuarded.<fn>
2025-07-26T08:27:20.1579726Z dart:async                                                               runZonedGuarded
2025-07-26T08:27:20.1580393Z package:bloc_test/src/bloc_test.dart 253:3                               _runZonedGuarded
2025-07-26T08:27:20.1581206Z package:bloc_test/src/bloc_test.dart 200:11                              testBloc
2025-07-26T08:27:20.1581993Z package:bloc_test/src/bloc_test.dart 156:13                              blocTest.<fn>
2025-07-26T08:27:20.1582866Z ##[endgroup]
2025-07-26T08:27:20.1705469Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc AppStarted emits [AuthenticationUnauthenticated] when exception occurs (failed)
2025-07-26T08:27:20.1714175Z MissingDummyValueError: Result<Session, AuthError>
2025-07-26T08:27:20.1715087Z 
2025-07-26T08:27:20.1715547Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.1716899Z 'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.1717871Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.1718841Z 
2025-07-26T08:27:20.1719312Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.1720510Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.1722278Z all the called methods.
2025-07-26T08:27:20.1740627Z 
2025-07-26T08:27:20.1743465Z package:mockito/src/dummies.dart 156:3                                   dummyValue
2025-07-26T08:27:20.1745535Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 145:17  MockSessionManager.getCurrentSession
2025-07-26T08:27:20.1746852Z test/unit/presentation/blocs/authentication_bloc_test.dart 131:35        main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.1747755Z package:bloc_test/src/bloc_test.dart 203:25                              testBloc.<fn>
2025-07-26T08:27:20.1748410Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1748972Z dart:async                                                               _Completer.completeError
2025-07-26T08:27:20.1749764Z package:bloc_test/src/bloc_test.dart 257:43                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.1750443Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1751037Z dart:async                                                               _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.1751893Z package:bloc_test/src/bloc_test.dart 254:5                               _runZonedGuarded.<fn>
2025-07-26T08:27:20.1752635Z dart:async                                                               runZonedGuarded
2025-07-26T08:27:20.1753342Z package:bloc_test/src/bloc_test.dart 253:3                               _runZonedGuarded
2025-07-26T08:27:20.1754161Z package:bloc_test/src/bloc_test.dart 200:11                              testBloc
2025-07-26T08:27:20.1754991Z package:bloc_test/src/bloc_test.dart 156:13                              blocTest.<fn>
2025-07-26T08:27:20.1756309Z ##[endgroup]
2025-07-26T08:27:20.1883079Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc LoginRequested emits [AuthenticationLoading, AuthenticationAuthenticated] when login succeeds (failed)
2025-07-26T08:27:20.1885192Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.1885830Z 
2025-07-26T08:27:20.1886394Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.1887473Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.1889394Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.1889715Z 
2025-07-26T08:27:20.1890016Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.1890760Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.1891348Z all the called methods.
2025-07-26T08:27:20.1891561Z 
2025-07-26T08:27:20.1891891Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.1893032Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 58:21  MockAuthenticationService.signInWithCredentials
2025-07-26T08:27:20.1894251Z test/unit/presentation/blocs/authentication_bloc_test.dart 146:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.1895222Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.1896104Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1896720Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.1897493Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.1898165Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.1898838Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.1899619Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.1900669Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.1901311Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.1902120Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.1902907Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.1903850Z ##[endgroup]
2025-07-26T08:27:20.2071659Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc LoginRequested emits [AuthenticationLoading, AuthenticationError] when login fails (failed)
2025-07-26T08:27:20.2073568Z Invalid argument(s): An ArgumentMatcher was declared as named email, but was not passed as an argument named email.
2025-07-26T08:27:20.2074267Z 
2025-07-26T08:27:20.2074418Z BAD:  when(obj.fn(anyNamed: "a")))
2025-07-26T08:27:20.2074866Z GOOD: when(obj.fn(a: anyNamed: "a")))
2025-07-26T08:27:20.2075589Z package:mockito/src/mock.dart 422:9                                      _InvocationForMatchedArguments._reconstituteNamedArgs.<fn>
2025-07-26T08:27:20.2076721Z dart:collection                                                          _LinkedHashMapMixin.forEach
2025-07-26T08:27:20.2077659Z package:mockito/src/mock.dart 416:22                                     _InvocationForMatchedArguments._reconstituteNamedArgs
2025-07-26T08:27:20.2078577Z package:mockito/src/mock.dart 373:28                                     new _InvocationForMatchedArguments
2025-07-26T08:27:20.2079356Z package:mockito/src/mock.dart 341:18                                     _useMatchedInvocationIfSet
2025-07-26T08:27:20.2080097Z package:mockito/src/mock.dart 163:18                                     Mock.noSuchMethod
2025-07-26T08:27:20.2081099Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 224:44  MockLoggerService.generateCorrelationId
2025-07-26T08:27:20.2082215Z test/unit/presentation/blocs/authentication_bloc_test.dart 53:23         main.<fn>.<fn>
2025-07-26T08:27:20.2083798Z ##[endgroup]
2025-07-26T08:27:20.2085465Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should disable refresh button during loading (failed)
2025-07-26T08:27:20.2087358Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:20.2088047Z The following _TypeError was thrown running a test:
2025-07-26T08:27:20.2088594Z type 'Icon' is not a subtype of type 'IconButton' in type cast
2025-07-26T08:27:20.2088967Z 
2025-07-26T08:27:20.2089154Z When the exception was thrown, this was the stack:
2025-07-26T08:27:20.2089791Z #0      WidgetController.widget (package:flutter_test/src/controller.dart:809:44)
2025-07-26T08:27:20.2090975Z #1      main.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart:255:33)
2025-07-26T08:27:20.2091984Z <asynchronous suspension>
2025-07-26T08:27:20.2092725Z #2      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:20.2093535Z <asynchronous suspension>
2025-07-26T08:27:20.2094217Z #3      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:20.2094638Z <asynchronous suspension>
2025-07-26T08:27:20.2094841Z <asynchronous suspension>
2025-07-26T08:27:20.2095054Z (elided one frame from package:stack_trace)
2025-07-26T08:27:20.2095229Z 
2025-07-26T08:27:20.2095310Z The test description was:
2025-07-26T08:27:20.2095538Z   should disable refresh button during loading
2025-07-26T08:27:20.2096214Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:20.2096513Z Test failed. See exception logs above.
2025-07-26T08:27:20.2097072Z The test description was: should disable refresh button during loading
2025-07-26T08:27:20.2097322Z 
2025-07-26T08:27:20.2097545Z ##[endgroup]
2025-07-26T08:27:20.2164515Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc LoginRequested emits [AuthenticationLoading, AuthenticationError] when unexpected error occurs (failed)
2025-07-26T08:27:20.2166468Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2166822Z 
2025-07-26T08:27:20.2167110Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2167980Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2168775Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2169130Z 
2025-07-26T08:27:20.2169452Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2170047Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2170397Z all the called methods.
2025-07-26T08:27:20.2170526Z 
2025-07-26T08:27:20.2170734Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2171377Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 58:21  MockAuthenticationService.signInWithCredentials
2025-07-26T08:27:20.2172079Z test/unit/presentation/blocs/authentication_bloc_test.dart 200:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.2172602Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.2172962Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2173271Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.2173893Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.2174621Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2175229Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.2176442Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.2177100Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.2177529Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.2177997Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.2178447Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.2178976Z ##[endgroup]
2025-07-26T08:27:20.2257887Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc LogoutRequested emits [AuthenticationUnauthenticated] when logout succeeds (failed)
2025-07-26T08:27:20.2260136Z Invalid argument(s): An ArgumentMatcher was declared as named email, but was not passed as an argument named email.
2025-07-26T08:27:20.2261000Z 
2025-07-26T08:27:20.2261946Z BAD:  when(obj.fn(anyNamed: "a")))
2025-07-26T08:27:20.2262352Z GOOD: when(obj.fn(a: anyNamed: "a")))
2025-07-26T08:27:20.2263094Z package:mockito/src/mock.dart 422:9                                      _InvocationForMatchedArguments._reconstituteNamedArgs.<fn>
2025-07-26T08:27:20.2264017Z dart:collection                                                          _LinkedHashMapMixin.forEach
2025-07-26T08:27:20.2264910Z package:mockito/src/mock.dart 416:22                                     _InvocationForMatchedArguments._reconstituteNamedArgs
2025-07-26T08:27:20.2266089Z package:mockito/src/mock.dart 373:28                                     new _InvocationForMatchedArguments
2025-07-26T08:27:20.2266990Z package:mockito/src/mock.dart 341:18                                     _useMatchedInvocationIfSet
2025-07-26T08:27:20.2268117Z package:mockito/src/mock.dart 163:18                                     Mock.noSuchMethod
2025-07-26T08:27:20.2269236Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 224:44  MockLoggerService.generateCorrelationId
2025-07-26T08:27:20.2270434Z test/unit/presentation/blocs/authentication_bloc_test.dart 53:23         main.<fn>.<fn>
2025-07-26T08:27:20.2271383Z ##[endgroup]
2025-07-26T08:27:20.2518661Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc LogoutRequested emits [AuthenticationUnauthenticated] even when logout fails (failed)
2025-07-26T08:27:20.2519689Z Expected: [Instance of 'AuthenticationUnauthenticated']
2025-07-26T08:27:20.2520042Z   Actual: [Instance of 'AuthenticationUnauthenticated']
2025-07-26T08:27:20.2520762Z    Which: at location [0] is <Instance of 'AuthenticationUnauthenticated'> instead of <Instance of 'AuthenticationUnauthenticated'>
2025-07-26T08:27:20.2522608Z 
2025-07-26T08:27:20.2523171Z WARNING: Please ensure state instances extend Equatable, override == and hashCode, or implement Comparable.
2025-07-26T08:27:20.2524260Z Alternatively, consider using Matchers in the expect of the blocTest rather than concrete state instances.
2025-07-26T08:27:20.2524894Z 
2025-07-26T08:27:20.2525107Z package:bloc_test/src/bloc_test.dart 236:7  testBloc
2025-07-26T08:27:20.2526069Z ##[endgroup]
2025-07-26T08:27:20.2609300Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc SessionCheckRequested emits [AuthenticationAuthenticated] when session is valid and user is not already authenticated (failed)
2025-07-26T08:27:20.2611638Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2612219Z 
2025-07-26T08:27:20.2612643Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2613734Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2614850Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2616096Z 
2025-07-26T08:27:20.2617045Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2618047Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2618790Z all the called methods.
2025-07-26T08:27:20.2619152Z 
2025-07-26T08:27:20.2619610Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2620835Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 81:21  MockAuthenticationService.getCurrentUser
2025-07-26T08:27:20.2622207Z test/unit/presentation/blocs/authentication_bloc_test.dart 253:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.2623297Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.2625050Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2625557Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.2626484Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.2627128Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2627650Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.2628348Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.2629025Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.2629659Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.2630423Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.2631231Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.2632436Z ##[endgroup]
2025-07-26T08:27:20.2711222Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc SessionCheckRequested does not emit when user is already authenticated (failed)
2025-07-26T08:27:20.2712869Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2713236Z 
2025-07-26T08:27:20.2713534Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2714453Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2715268Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2715623Z 
2025-07-26T08:27:20.2716146Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2716984Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2717610Z all the called methods.
2025-07-26T08:27:20.2717822Z 
2025-07-26T08:27:20.2718169Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2719309Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 81:21  MockAuthenticationService.getCurrentUser
2025-07-26T08:27:20.2720536Z test/unit/presentation/blocs/authentication_bloc_test.dart 266:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.2721401Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.2722022Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2722555Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.2723340Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.2724038Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2724617Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.2725423Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.2726619Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.2727370Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.2728189Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.2728999Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.2729809Z ##[endgroup]
2025-07-26T08:27:20.2787521Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc SessionCheckRequested emits [AuthenticationUnauthenticated] when session check fails (failed)
2025-07-26T08:27:20.2789234Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2789618Z 
2025-07-26T08:27:20.2789921Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2790891Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2791740Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2792099Z 
2025-07-26T08:27:20.2792412Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2793361Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2793969Z all the called methods.
2025-07-26T08:27:20.2794190Z 
2025-07-26T08:27:20.2794520Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2795619Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 81:21  MockAuthenticationService.getCurrentUser
2025-07-26T08:27:20.2797016Z test/unit/presentation/blocs/authentication_bloc_test.dart 278:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.2797823Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.2798560Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2799001Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.2799553Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.2800044Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2800381Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.2800836Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.2801253Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.2801713Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.2802338Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.2802968Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.2803659Z ##[endgroup]
2025-07-26T08:27:20.2850104Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc SessionCheckRequested emits [AuthenticationUnauthenticated] when exception occurs (failed)
2025-07-26T08:27:20.2851235Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2851507Z 
2025-07-26T08:27:20.2851822Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2852481Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2852951Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2853155Z 
2025-07-26T08:27:20.2853336Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2853807Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2854626Z all the called methods.
2025-07-26T08:27:20.2854878Z 
2025-07-26T08:27:20.2855216Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2856563Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 81:21  MockAuthenticationService.getCurrentUser
2025-07-26T08:27:20.2857787Z test/unit/presentation/blocs/authentication_bloc_test.dart 291:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.2858771Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.2859444Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2860015Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.2860785Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.2861486Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2862072Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.2862884Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.2863612Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.2864299Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.2865127Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.2866126Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.2867136Z ##[endgroup]
2025-07-26T08:27:20.2918199Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc TokenRefreshRequested emits [AuthenticationAuthenticated] when token refresh succeeds (failed)
2025-07-26T08:27:20.2920176Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2920591Z 
2025-07-26T08:27:20.2920904Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2921877Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2922725Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2923076Z 
2025-07-26T08:27:20.2923265Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2923985Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2924320Z all the called methods.
2025-07-26T08:27:20.2924445Z 
2025-07-26T08:27:20.2924647Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2925248Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 99:21  MockAuthenticationService.refreshToken
2025-07-26T08:27:20.2926324Z test/unit/presentation/blocs/authentication_bloc_test.dart 306:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.2927032Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.2927396Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2927711Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.2928122Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.2928572Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.2929091Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.2929852Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.2930506Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.2931221Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.2932254Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.2932992Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.2933824Z ##[endgroup]
2025-07-26T08:27:20.2991421Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc TokenRefreshRequested emits [AuthenticationUnauthenticated] when token refresh fails (failed)
2025-07-26T08:27:20.2993133Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.2993525Z 
2025-07-26T08:27:20.2993843Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.2994787Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.2995834Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.2996186Z 
2025-07-26T08:27:20.2996523Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.2997324Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.2997929Z all the called methods.
2025-07-26T08:27:20.2998150Z 
2025-07-26T08:27:20.2998497Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.2999716Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 99:21  MockAuthenticationService.refreshToken
2025-07-26T08:27:20.3000912Z test/unit/presentation/blocs/authentication_bloc_test.dart 319:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.3001858Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.3002522Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.3003077Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.3004122Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.3004813Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.3005394Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.3006391Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.3007146Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.3007841Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.3008661Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.3009472Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.3010315Z ##[endgroup]
2025-07-26T08:27:20.3061446Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc TokenRefreshRequested emits [AuthenticationUnauthenticated] when exception occurs (failed)
2025-07-26T08:27:20.3063151Z MissingDummyValueError: Result<UserProfile, AuthError>
2025-07-26T08:27:20.3063549Z 
2025-07-26T08:27:20.3063871Z This means Mockito was not smart enough to generate a dummy value of type
2025-07-26T08:27:20.3064831Z 'Result<UserProfile, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
2025-07-26T08:27:20.3065895Z functions to give Mockito a proper dummy value.
2025-07-26T08:27:20.3066257Z 
2025-07-26T08:27:20.3066606Z Please note that due to implementation details Mockito sometimes needs users
2025-07-26T08:27:20.3067411Z to provide dummy values for some types, even if they plan to explicitly stub
2025-07-26T08:27:20.3068030Z all the called methods.
2025-07-26T08:27:20.3068245Z 
2025-07-26T08:27:20.3068601Z package:mockito/src/dummies.dart 156:3                                  dummyValue
2025-07-26T08:27:20.3069938Z test/unit/presentation/blocs/authentication_bloc_test.mocks.dart 99:21  MockAuthenticationService.refreshToken
2025-07-26T08:27:20.3071181Z test/unit/presentation/blocs/authentication_bloc_test.dart 332:32       main.<fn>.<fn>.<fn>
2025-07-26T08:27:20.3072133Z package:bloc_test/src/bloc_test.dart 203:25                             testBloc.<fn>
2025-07-26T08:27:20.3072811Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.3073352Z dart:async                                                              _Completer.completeError
2025-07-26T08:27:20.3074135Z package:bloc_test/src/bloc_test.dart 257:43                             _runZonedGuarded.<fn>
2025-07-26T08:27:20.3074828Z ===== asynchronous gap ===========================
2025-07-26T08:27:20.3075404Z dart:async                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:20.3076400Z package:bloc_test/src/bloc_test.dart 254:5                              _runZonedGuarded.<fn>
2025-07-26T08:27:20.3077160Z dart:async                                                              runZonedGuarded
2025-07-26T08:27:20.3077888Z package:bloc_test/src/bloc_test.dart 253:3                              _runZonedGuarded
2025-07-26T08:27:20.3078710Z package:bloc_test/src/bloc_test.dart 200:11                             testBloc
2025-07-26T08:27:20.3079509Z package:bloc_test/src/bloc_test.dart 156:13                             blocTest.<fn>
2025-07-26T08:27:20.3080382Z ##[endgroup]
2025-07-26T08:27:20.3114882Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc getUserFriendlyErrorMessage should return user-friendly message for invalid credentials
2025-07-26T08:27:20.3151202Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc getUserFriendlyErrorMessage should return user-friendly message for network errors
2025-07-26T08:27:20.3186322Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc getUserFriendlyErrorMessage should return user-friendly message for timeout errors
2025-07-26T08:27:20.3221045Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc getUserFriendlyErrorMessage should return user-friendly message for rate limit errors
2025-07-26T08:27:20.3253289Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc getUserFriendlyErrorMessage should return user-friendly message for maintenance errors
2025-07-26T08:27:20.3299048Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc getUserFriendlyErrorMessage should return default message for unknown errors
2025-07-26T08:27:20.8960459Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests email should return null for valid emails
2025-07-26T08:27:20.8987637Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests email should return error message for invalid emails
2025-07-26T08:27:20.9009317Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests email should return error message for empty email
2025-07-26T08:27:20.9030014Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests required should return null for non-empty values
2025-07-26T08:27:20.9049509Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests required should return error message for empty values
2025-07-26T08:27:20.9068281Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests required should use custom field name in error message
2025-07-26T08:27:20.9088868Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests minLength should return null for values meeting minimum length
2025-07-26T08:27:20.9108959Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests minLength should return error message for values below minimum length
2025-07-26T08:27:20.9127007Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/shared/validators_test.dart: Validators Tests minLength should use custom field name in error message
2025-07-26T08:27:21.2365077Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signInWithCredentials should return UserProfile on successful authentication (failed)
2025-07-26T08:27:21.2373961Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.2375318Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.2376430Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.2377454Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.2380105Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.2381100Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.2382043Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.2382913Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.2405006Z ##[endgroup]
2025-07-26T08:27:21.2697740Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signInWithCredentials should return AuthError when authentication fails (failed)
2025-07-26T08:27:21.2700580Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.2703634Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.2704536Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.2705563Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.2706931Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.2707946Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.2708913Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.2709809Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.2710841Z ##[endgroup]
2025-07-26T08:27:21.2995283Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signInWithCredentials should return AuthError when user is null in response (failed)
2025-07-26T08:27:21.2997842Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.2999107Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.2999857Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3000854Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3001994Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3003081Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3004439Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3005303Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3006446Z ##[endgroup]
2025-07-26T08:27:21.3229634Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService getCurrentUser should return UserProfile when user is authenticated and session is valid (failed)
2025-07-26T08:27:21.3264818Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3266614Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3267488Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3268618Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3269946Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3271207Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3272396Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3273549Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3274574Z ##[endgroup]
2025-07-26T08:27:21.3424278Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService getCurrentUser should return AuthError when no current user (failed)
2025-07-26T08:27:21.3427041Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3435326Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3438552Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3439913Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3441482Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3443141Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3444649Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3446163Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3447014Z ##[endgroup]
2025-07-26T08:27:21.3559642Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService getCurrentUser should return AuthError when session is invalid (failed)
2025-07-26T08:27:21.3568582Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3569908Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3570649Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3571686Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3572794Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3573865Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3574918Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3576047Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3576943Z ##[endgroup]
2025-07-26T08:27:21.3632017Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService refreshToken should return UserProfile on successful token refresh (failed)
2025-07-26T08:27:21.3639177Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3649327Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3650075Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3651072Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3652173Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3653277Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3655187Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3656179Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3656718Z ##[endgroup]
2025-07-26T08:27:21.3708450Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService refreshToken should return AuthError when token refresh fails (failed)
2025-07-26T08:27:21.3710528Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3711753Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3712490Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3713516Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3714166Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3714758Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3715338Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3716230Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3716756Z ##[endgroup]
2025-07-26T08:27:21.3767844Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signOut should successfully sign out user (failed)
2025-07-26T08:27:21.3770747Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3772011Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3772744Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3773729Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3774825Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3776503Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3777559Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3778466Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3779666Z ##[endgroup]
2025-07-26T08:27:21.3836198Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signOut should clear local session even if remote sign out fails (failed)
2025-07-26T08:27:21.3838053Z 'package:supabase_flutter/src/supabase.dart': Failed assertion: line 45 pos 7: '_instance._initialized': You must initialize the supabase instance before calling Supabase.instance
2025-07-26T08:27:21.3840642Z dart:core                                                    _AssertionError._throwNew
2025-07-26T08:27:21.3841576Z package:supabase_flutter/src/supabase.dart 45:7              Supabase.instance
2025-07-26T08:27:21.3842538Z package:beachref/services/authentication_service.dart 15:45  new AuthenticationService._internal
2025-07-26T08:27:21.3843576Z package:beachref/services/authentication_service.dart 11:72  AuthenticationService._instance
2025-07-26T08:27:21.3844554Z package:beachref/services/authentication_service.dart        AuthenticationService._instance
2025-07-26T08:27:21.3845118Z package:beachref/services/authentication_service.dart 12:38  new AuthenticationService
2025-07-26T08:27:21.3845633Z test/unit/services/authentication_service_test.dart 44:21    main.<fn>.<fn>
2025-07-26T08:27:21.3846316Z ##[endgroup]
2025-07-26T08:27:21.7093236Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests healthCheck should return success when API is reachable
2025-07-26T08:27:21.7095903Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7096346Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7096831Z   CorrelationId: corr_1753518441681_1
2025-07-26T08:27:21.7097363Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7098034Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7098552Z   CorrelationId: corr_1753518441687_3
2025-07-26T08:27:21.7099196Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=1
2025-07-26T08:27:21.7099824Z [VIS Service] Response status: 200
2025-07-26T08:27:21.7100823Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:21.7101578Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":11,"totalApiCalls":1}
2025-07-26T08:27:21.7102278Z   CorrelationId: corr_1753518441686_2
2025-07-26T08:27:21.7102660Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7103209Z ##[endgroup]
2025-07-26T08:27:21.7163954Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests healthCheck should return error when API is unreachable
2025-07-26T08:27:21.7173227Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7173733Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7174254Z   CorrelationId: corr_1753518441711_4
2025-07-26T08:27:21.7174853Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7175561Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7176409Z   CorrelationId: corr_1753518441712_6
2025-07-26T08:27:21.7177074Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=1
2025-07-26T08:27:21.7177737Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7178335Z ##[endgroup]
2025-07-26T08:27:21.7290822Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests healthCheck should return error when circuit breaker is open
2025-07-26T08:27:21.7292139Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7292570Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7293055Z   CorrelationId: corr_1753518441718_7
2025-07-26T08:27:21.7293582Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7294234Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7294759Z   CorrelationId: corr_1753518441718_9
2025-07-26T08:27:21.7295350Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=1
2025-07-26T08:27:21.7296227Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7297003Z   CorrelationId: corr_1753518441720_10
2025-07-26T08:27:21.7297547Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7298194Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7298702Z   CorrelationId: corr_1753518441720_12
2025-07-26T08:27:21.7299161Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7299616Z   CorrelationId: corr_1753518441721_13
2025-07-26T08:27:21.7300137Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7300813Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7301347Z   CorrelationId: corr_1753518441722_15
2025-07-26T08:27:21.7301804Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7302285Z   CorrelationId: corr_1753518441723_16
2025-07-26T08:27:21.7302829Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7303555Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7304106Z   CorrelationId: corr_1753518441723_18
2025-07-26T08:27:21.7304607Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7305115Z   CorrelationId: corr_1753518441724_19
2025-07-26T08:27:21.7305812Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7306528Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7307076Z   CorrelationId: corr_1753518441725_21
2025-07-26T08:27:21.7307603Z [VIS Service] Circuit breaker opened due to consecutive failures
2025-07-26T08:27:21.7308236Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7308754Z   CorrelationId: corr_1753518441726_22
2025-07-26T08:27:21.7309238Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:27:21.7309718Z   CorrelationId: corr_1753518441727_23
2025-07-26T08:27:21.7310478Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7311100Z ##[endgroup]
2025-07-26T08:27:21.7938821Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests getTournaments should return tournaments when API call succeeds (failed)
2025-07-26T08:27:21.7940886Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7941591Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:27:21.7942419Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:21.7943214Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:21.7943857Z   CorrelationId: corr_1753518441732_25
2025-07-26T08:27:21.7946493Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:27:21.7962537Z [VIS Service] Response status: 200
2025-07-26T08:27:21.7963063Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:21.7963863Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":2,"totalApiCalls":1}
2025-07-26T08:27:21.7964580Z   CorrelationId: corr_1753518441732_24
2025-07-26T08:27:21.7964981Z [VIS Service] Cache cleared
2025-07-26T08:27:21.7965317Z Expected: true
2025-07-26T08:27:21.7965597Z   Actual: <false>
2025-07-26T08:27:21.7965965Z 
2025-07-26T08:27:21.7966200Z package:matcher                                             expect
2025-07-26T08:27:21.7966808Z package:flutter_test/src/widget_tester.dart 480:18          expect
2025-07-26T08:27:21.7972783Z test/unit/services/vis_integration_service_test.dart 110:9  main.<fn>.<fn>.<fn>
2025-07-26T08:27:21.7973785Z ##[endgroup]
2025-07-26T08:27:22.0993617Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager storeSession should store session successfully (failed)
2025-07-26T08:27:22.0994939Z [LogLevel.info] [SESSION_MANAGER] Storing session
2025-07-26T08:27:22.0996930Z   Data: {"session_id":"test-session-id","user_id":"test-user-id","expires_at":"2025-07-26T09:27:22.032712","remember_me":true,"device_info":"Test Device","created_at":"2025-07-26T08:27:22.033746","is_expired":false,"time_until_expiry":59}
2025-07-26T08:27:22.0998107Z   CorrelationId: corr_1753518442039_1
2025-07-26T08:27:22.0998569Z [LogLevel.error] [SESSION_MANAGER] Failed to store session
2025-07-26T08:27:22.1002355Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1005147Z   CorrelationId: corr_1753518442039_1
2025-07-26T08:27:22.1005395Z Binding has not yet been initialized.
2025-07-26T08:27:22.1006243Z The "instance" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.
2025-07-26T08:27:22.1008526Z Typically, this is done by calling "WidgetsFlutterBinding.ensureInitialized()" or "runApp()" (the latter calls the former). Typically this call is done in the "void main()" method. The "ensureInitialized" method is idempotent; calling it multiple times is not harmful. After calling that method, the "instance" getter will return the binding.
2025-07-26T08:27:22.1009959Z In a test, one can call "TestWidgetsFlutterBinding.ensureInitialized()" as the first line in the test's "main()" method to initialize the binding.
2025-07-26T08:27:22.1011474Z If ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the "instance" getter.
2025-07-26T08:27:22.1012498Z package:flutter/src/foundation/binding.dart 309:9                                                       BindingBase.checkInstance.<fn>
2025-07-26T08:27:22.1013131Z package:flutter/src/foundation/binding.dart 390:6                                                       BindingBase.checkInstance
2025-07-26T08:27:22.1013733Z package:flutter/src/services/binding.dart 68:54                                                         ServicesBinding.instance
2025-07-26T08:27:22.1014346Z package:flutter/src/services/platform_channel.dart 158:25                                               _findBinaryMessenger
2025-07-26T08:27:22.1014994Z package:flutter/src/services/platform_channel.dart 293:56                                               MethodChannel.binaryMessenger
2025-07-26T08:27:22.1015780Z package:flutter/src/services/platform_channel.dart 327:15                                               MethodChannel._invokeMethod
2025-07-26T08:27:22.1016427Z package:flutter/src/services/platform_channel.dart 507:12                                               MethodChannel.invokeMethod
2025-07-26T08:27:22.1017195Z package:flutter_secure_storage_platform_interface/src/method_channel_flutter_secure_storage.dart 93:16  MethodChannelFlutterSecureStorage.write
2025-07-26T08:27:22.1017971Z package:flutter_secure_storage/flutter_secure_storage.dart 114:23                                       FlutterSecureStorage.write
2025-07-26T08:27:22.1018618Z package:beachref/services/session_manager.dart 38:22                                                    SessionManager.storeSession
2025-07-26T08:27:22.1019435Z test/unit/services/session_manager_test.dart 49:32                                                      main.<fn>.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1020093Z package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1020563Z package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1021121Z test/unit/services/session_manager_test.dart 48:15                                                      main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1021538Z ===== asynchronous gap ===========================
2025-07-26T08:27:22.1021872Z dart:async                                                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:22.1022368Z package:beachref/services/session_manager.dart 38:7                                                     SessionManager.storeSession
2025-07-26T08:27:22.1022952Z test/unit/services/session_manager_test.dart 49:32                                                      main.<fn>.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1023427Z package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1023892Z package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1024455Z test/unit/services/session_manager_test.dart 48:15                                                      main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1025024Z ##[endgroup]
2025-07-26T08:27:22.1327236Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager storeSession should throw exception when storage fails (failed)
2025-07-26T08:27:22.1328490Z [LogLevel.info] [SESSION_MANAGER] Storing session
2025-07-26T08:27:22.1329835Z   Data: {"session_id":"test-session-id","user_id":"test-user-id","expires_at":"2025-07-26T09:27:22.101647","remember_me":true,"device_info":"Test Device","created_at":"2025-07-26T08:27:22.101671","is_expired":false,"time_until_expiry":59}
2025-07-26T08:27:22.1331513Z   CorrelationId: corr_1753518442102_2
2025-07-26T08:27:22.1332040Z [LogLevel.error] [SESSION_MANAGER] Failed to store session
2025-07-26T08:27:22.1337086Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1340096Z   CorrelationId: corr_1753518442102_2
2025-07-26T08:27:22.1340361Z Expected: throws <Instance of 'Exception'>
2025-07-26T08:27:22.1340610Z   Actual: <Closure: () => Future<void>>
2025-07-26T08:27:22.1341015Z    Which: threw FlutterError:<Binding has not yet been initialized.
2025-07-26T08:27:22.1341975Z                 The "instance" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.
2025-07-26T08:27:22.1344364Z                 Typically, this is done by calling "WidgetsFlutterBinding.ensureInitialized()" or "runApp()" (the latter calls the former). Typically this call is done in the "void main()" method. The "ensureInitialized" method is idempotent; calling it multiple times is not harmful. After calling that method, the "instance" getter will return the binding.
2025-07-26T08:27:22.1347373Z                 In a test, one can call "TestWidgetsFlutterBinding.ensureInitialized()" as the first line in the test's "main()" method to initialize the binding.
2025-07-26T08:27:22.1349431Z                 If ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the "instance" getter.>
2025-07-26T08:27:22.1351370Z           stack package:flutter/src/foundation/binding.dart 309:9                                                       BindingBase.checkInstance.<fn>
2025-07-26T08:27:22.1352522Z                 package:flutter/src/foundation/binding.dart 390:6                                                       BindingBase.checkInstance
2025-07-26T08:27:22.1353627Z                 package:flutter/src/services/binding.dart 68:54                                                         ServicesBinding.instance
2025-07-26T08:27:22.1354812Z                 package:flutter/src/services/platform_channel.dart 158:25                                               _findBinaryMessenger
2025-07-26T08:27:22.1356195Z                 package:flutter/src/services/platform_channel.dart 293:56                                               MethodChannel.binaryMessenger
2025-07-26T08:27:22.1357421Z                 package:flutter/src/services/platform_channel.dart 327:15                                               MethodChannel._invokeMethod
2025-07-26T08:27:22.1358617Z                 package:flutter/src/services/platform_channel.dart 507:12                                               MethodChannel.invokeMethod
2025-07-26T08:27:22.1360074Z                 package:flutter_secure_storage_platform_interface/src/method_channel_flutter_secure_storage.dart 93:16  MethodChannelFlutterSecureStorage.write
2025-07-26T08:27:22.1361504Z                 package:flutter_secure_storage/flutter_secure_storage.dart 114:23                                       FlutterSecureStorage.write
2025-07-26T08:27:22.1363077Z                 package:beachref/services/session_manager.dart 38:22                                                    SessionManager.storeSession
2025-07-26T08:27:22.1364187Z                 test/unit/services/session_manager_test.dart 72:32                                                      main.<fn>.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1365087Z                 package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1366175Z                 package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1367255Z                 test/unit/services/session_manager_test.dart 71:15                                                      main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1368075Z                 ===== asynchronous gap ===========================
2025-07-26T08:27:22.1368743Z                 package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1369947Z                 package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1371104Z                 test/unit/services/session_manager_test.dart 71:15                                                      main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1371964Z                 
2025-07-26T08:27:22.1372564Z           which is not an instance of 'Exception'
2025-07-26T08:27:22.1372950Z 
2025-07-26T08:27:22.1373269Z package:matcher                                     expectLater
2025-07-26T08:27:22.1374123Z package:flutter_test/src/widget_tester.dart 517:25  expectLater
2025-07-26T08:27:22.1375048Z test/unit/services/session_manager_test.dart 71:15  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1376496Z ##[endgroup]
2025-07-26T08:27:22.1443653Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager getCurrentSession should return session when valid session exists (failed)
2025-07-26T08:27:22.1445442Z [LogLevel.debug] [SESSION_MANAGER] Retrieving current session
2025-07-26T08:27:22.1446287Z   CorrelationId: corr_1753518442136_3
2025-07-26T08:27:22.1447032Z [LogLevel.error] [SESSION_MANAGER] Failed to retrieve session
2025-07-26T08:27:22.1452405Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1469059Z   CorrelationId: corr_1753518442136_3
2025-07-26T08:27:22.1469531Z Expected: true
2025-07-26T08:27:22.1469817Z   Actual: <false>
2025-07-26T08:27:22.1470017Z 
2025-07-26T08:27:22.1470229Z package:matcher                                     expect
2025-07-26T08:27:22.1470810Z package:flutter_test/src/widget_tester.dart 480:18  expect
2025-07-26T08:27:22.1471494Z test/unit/services/session_manager_test.dart 101:9  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1472359Z ##[endgroup]
2025-07-26T08:27:22.1568903Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager getCurrentSession should return error when no session exists (failed)
2025-07-26T08:27:22.1570719Z [LogLevel.debug] [SESSION_MANAGER] Retrieving current session
2025-07-26T08:27:22.1571306Z   CorrelationId: corr_1753518442146_4
2025-07-26T08:27:22.1571848Z [LogLevel.error] [SESSION_MANAGER] Failed to retrieve session
2025-07-26T08:27:22.1577326Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1582378Z   CorrelationId: corr_1753518442146_4
2025-07-26T08:27:22.1582825Z Expected: 'No session found'
2025-07-26T08:27:22.1583243Z   Actual: 'Session retrieval error'
2025-07-26T08:27:22.1583649Z    Which: is different.
2025-07-26T08:27:22.1584004Z           Expected: No session ...
2025-07-26T08:27:22.1584393Z             Actual: Session re ...
2025-07-26T08:27:22.1584763Z                     ^
2025-07-26T08:27:22.1585090Z            Differ at offset 0
2025-07-26T08:27:22.1585345Z 
2025-07-26T08:27:22.1585561Z package:matcher                                      expect
2025-07-26T08:27:22.1586401Z package:flutter_test/src/widget_tester.dart 480:18   expect
2025-07-26T08:27:22.1587106Z test/unit/services/session_manager_test.dart 124:11  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1587974Z ##[endgroup]
2025-07-26T08:27:22.1664523Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager getCurrentSession should return error when session is expired (failed)
2025-07-26T08:27:22.1666140Z [LogLevel.debug] [SESSION_MANAGER] Retrieving current session
2025-07-26T08:27:22.1666689Z   CorrelationId: corr_1753518442161_5
2025-07-26T08:27:22.1667209Z [LogLevel.error] [SESSION_MANAGER] Failed to retrieve session
2025-07-26T08:27:22.1672191Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1677440Z   CorrelationId: corr_1753518442161_5
2025-07-26T08:27:22.1677907Z Expected: 'Session expired or invalid'
2025-07-26T08:27:22.1678376Z   Actual: 'Session retrieval error'
2025-07-26T08:27:22.1678776Z    Which: is different.
2025-07-26T08:27:22.1679143Z           Expected: Session expired or ...
2025-07-26T08:27:22.1679584Z             Actual: Session retrieval  ...
2025-07-26T08:27:22.1679974Z                             ^
2025-07-26T08:27:22.1680313Z            Differ at offset 8
2025-07-26T08:27:22.1680545Z 
2025-07-26T08:27:22.1680748Z package:matcher                                      expect
2025-07-26T08:27:22.1681548Z package:flutter_test/src/widget_tester.dart 480:18   expect
2025-07-26T08:27:22.1682242Z test/unit/services/session_manager_test.dart 154:11  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1683039Z ##[endgroup]
2025-07-26T08:27:22.1749271Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager getCurrentSession should return error when session has empty tokens (failed)
2025-07-26T08:27:22.1750705Z [LogLevel.debug] [SESSION_MANAGER] Retrieving current session
2025-07-26T08:27:22.1751188Z   CorrelationId: corr_1753518442168_6
2025-07-26T08:27:22.1751509Z [LogLevel.error] [SESSION_MANAGER] Failed to retrieve session
2025-07-26T08:27:22.1755562Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1758758Z   CorrelationId: corr_1753518442168_6
2025-07-26T08:27:22.1759042Z No matching calls (actually, no calls at all).
2025-07-26T08:27:22.1759408Z (If you called `verify(...).called(0);`, please instead use `verifyNever(...);`.)
2025-07-26T08:27:22.1759797Z package:matcher                                      fail
2025-07-26T08:27:22.1760197Z package:mockito/src/mock.dart 797:7                  _VerifyCall._checkWith
2025-07-26T08:27:22.1760806Z package:mockito/src/mock.dart 1071:18                _makeVerify.<fn>
2025-07-26T08:27:22.1761252Z test/unit/services/session_manager_test.dart 184:15  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1761725Z ##[endgroup]
2025-07-26T08:27:22.1786876Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager getCurrentSession should return error when storage throws exception
2025-07-26T08:27:22.1787697Z [LogLevel.debug] [SESSION_MANAGER] Retrieving current session
2025-07-26T08:27:22.1788015Z   CorrelationId: corr_1753518442176_7
2025-07-26T08:27:22.1788428Z [LogLevel.error] [SESSION_MANAGER] Failed to retrieve session
2025-07-26T08:27:22.1793464Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1798613Z   CorrelationId: corr_1753518442176_7
2025-07-26T08:27:22.1799278Z ##[endgroup]
2025-07-26T08:27:22.1875139Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager clearSession should clear session successfully (failed)
2025-07-26T08:27:22.1876292Z [LogLevel.info] [SESSION_MANAGER] Clearing session
2025-07-26T08:27:22.1876593Z   CorrelationId: corr_1753518442180_8
2025-07-26T08:27:22.1876899Z [LogLevel.error] [SESSION_MANAGER] Failed to clear session
2025-07-26T08:27:22.1880192Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1883536Z   CorrelationId: corr_1753518442180_8
2025-07-26T08:27:22.1883792Z Binding has not yet been initialized.
2025-07-26T08:27:22.1884263Z The "instance" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.
2025-07-26T08:27:22.1886008Z Typically, this is done by calling "WidgetsFlutterBinding.ensureInitialized()" or "runApp()" (the latter calls the former). Typically this call is done in the "void main()" method. The "ensureInitialized" method is idempotent; calling it multiple times is not harmful. After calling that method, the "instance" getter will return the binding.
2025-07-26T08:27:22.1887469Z In a test, one can call "TestWidgetsFlutterBinding.ensureInitialized()" as the first line in the test's "main()" method to initialize the binding.
2025-07-26T08:27:22.1888767Z If ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the "instance" getter.
2025-07-26T08:27:22.1889947Z package:flutter/src/foundation/binding.dart 309:9                                                       BindingBase.checkInstance.<fn>
2025-07-26T08:27:22.1890601Z package:flutter/src/foundation/binding.dart 390:6                                                       BindingBase.checkInstance
2025-07-26T08:27:22.1891226Z package:flutter/src/services/binding.dart 68:54                                                         ServicesBinding.instance
2025-07-26T08:27:22.1891840Z package:flutter/src/services/platform_channel.dart 158:25                                               _findBinaryMessenger
2025-07-26T08:27:22.1892500Z package:flutter/src/services/platform_channel.dart 293:56                                               MethodChannel.binaryMessenger
2025-07-26T08:27:22.1893165Z package:flutter/src/services/platform_channel.dart 327:15                                               MethodChannel._invokeMethod
2025-07-26T08:27:22.1893802Z package:flutter/src/services/platform_channel.dart 507:12                                               MethodChannel.invokeMethod
2025-07-26T08:27:22.1894766Z package:flutter_secure_storage_platform_interface/src/method_channel_flutter_secure_storage.dart 41:16  MethodChannelFlutterSecureStorage.delete
2025-07-26T08:27:22.1895984Z package:flutter_secure_storage/flutter_secure_storage.dart 214:21                                       FlutterSecureStorage.delete
2025-07-26T08:27:22.1896637Z package:beachref/services/session_manager.dart 131:22                                                   SessionManager.clearSession
2025-07-26T08:27:22.1897566Z test/unit/services/session_manager_test.dart 211:32                                                     main.<fn>.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1898066Z package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1898709Z package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1899280Z test/unit/services/session_manager_test.dart 210:15                                                     main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1899732Z ===== asynchronous gap ===========================
2025-07-26T08:27:22.1900080Z dart:async                                                                                              _CustomZone.registerBinaryCallback
2025-07-26T08:27:22.1900591Z package:beachref/services/session_manager.dart 131:7                                                    SessionManager.clearSession
2025-07-26T08:27:22.1901205Z test/unit/services/session_manager_test.dart 211:32                                                     main.<fn>.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1901689Z package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1902171Z package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1902775Z test/unit/services/session_manager_test.dart 210:15                                                     main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1903402Z No matching calls (actually, no calls at all).
2025-07-26T08:27:22.1903768Z (If you called `verify(...).called(0);`, please instead use `verifyNever(...);`.)
2025-07-26T08:27:22.1904150Z package:matcher                                      fail
2025-07-26T08:27:22.1904537Z package:mockito/src/mock.dart 797:7                  _VerifyCall._checkWith
2025-07-26T08:27:22.1905144Z package:mockito/src/mock.dart 1071:18                _makeVerify.<fn>
2025-07-26T08:27:22.1905572Z test/unit/services/session_manager_test.dart 215:15  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1906423Z ##[endgroup]
2025-07-26T08:27:22.1962088Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager clearSession should throw exception when storage delete fails (failed)
2025-07-26T08:27:22.1963338Z [LogLevel.info] [SESSION_MANAGER] Clearing session
2025-07-26T08:27:22.1963677Z   CorrelationId: corr_1753518442189_9
2025-07-26T08:27:22.1963971Z [LogLevel.error] [SESSION_MANAGER] Failed to clear session
2025-07-26T08:27:22.1968587Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.1973375Z   CorrelationId: corr_1753518442189_9
2025-07-26T08:27:22.1973835Z Expected: throws <Instance of 'Exception'>
2025-07-26T08:27:22.1974301Z   Actual: <Closure: () => Future<void>>
2025-07-26T08:27:22.1974859Z    Which: threw FlutterError:<Binding has not yet been initialized.
2025-07-26T08:27:22.1976139Z                 The "instance" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.
2025-07-26T08:27:22.1978603Z                 Typically, this is done by calling "WidgetsFlutterBinding.ensureInitialized()" or "runApp()" (the latter calls the former). Typically this call is done in the "void main()" method. The "ensureInitialized" method is idempotent; calling it multiple times is not harmful. After calling that method, the "instance" getter will return the binding.
2025-07-26T08:27:22.1981439Z                 In a test, one can call "TestWidgetsFlutterBinding.ensureInitialized()" as the first line in the test's "main()" method to initialize the binding.
2025-07-26T08:27:22.1983275Z                 If ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the "instance" getter.>
2025-07-26T08:27:22.1985185Z           stack package:flutter/src/foundation/binding.dart 309:9                                                       BindingBase.checkInstance.<fn>
2025-07-26T08:27:22.1986564Z                 package:flutter/src/foundation/binding.dart 390:6                                                       BindingBase.checkInstance
2025-07-26T08:27:22.1987720Z                 package:flutter/src/services/binding.dart 68:54                                                         ServicesBinding.instance
2025-07-26T08:27:22.1988879Z                 package:flutter/src/services/platform_channel.dart 158:25                                               _findBinaryMessenger
2025-07-26T08:27:22.1990095Z                 package:flutter/src/services/platform_channel.dart 293:56                                               MethodChannel.binaryMessenger
2025-07-26T08:27:22.1991326Z                 package:flutter/src/services/platform_channel.dart 327:15                                               MethodChannel._invokeMethod
2025-07-26T08:27:22.1992548Z                 package:flutter/src/services/platform_channel.dart 507:12                                               MethodChannel.invokeMethod
2025-07-26T08:27:22.1994016Z                 package:flutter_secure_storage_platform_interface/src/method_channel_flutter_secure_storage.dart 41:16  MethodChannelFlutterSecureStorage.delete
2025-07-26T08:27:22.1995979Z                 package:flutter_secure_storage/flutter_secure_storage.dart 214:21                                       FlutterSecureStorage.delete
2025-07-26T08:27:22.1997138Z                 package:beachref/services/session_manager.dart 131:22                                                   SessionManager.clearSession
2025-07-26T08:27:22.1998123Z                 test/unit/services/session_manager_test.dart 225:32                                                     main.<fn>.<fn>.<fn>.<fn>
2025-07-26T08:27:22.1998678Z                 package:matcher                                                                                         expectLater
2025-07-26T08:27:22.1999183Z                 package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.1999792Z                 test/unit/services/session_manager_test.dart 224:15                                                     main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.2000271Z                 ===== asynchronous gap ===========================
2025-07-26T08:27:22.2000656Z                 package:matcher                                                                                         expectLater
2025-07-26T08:27:22.2001170Z                 package:flutter_test/src/widget_tester.dart 517:25                                                      expectLater
2025-07-26T08:27:22.2001776Z                 test/unit/services/session_manager_test.dart 224:15                                                     main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.2002195Z                 
2025-07-26T08:27:22.2002405Z           which is not an instance of 'Exception'
2025-07-26T08:27:22.2002600Z 
2025-07-26T08:27:22.2002745Z package:matcher                                      expectLater
2025-07-26T08:27:22.2003315Z package:flutter_test/src/widget_tester.dart 517:25   expectLater
2025-07-26T08:27:22.2003756Z test/unit/services/session_manager_test.dart 224:15  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.2004803Z ##[endgroup]
2025-07-26T08:27:22.2033379Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager hasSession should return true when session exists (failed)
2025-07-26T08:27:22.2034715Z [LogLevel.error] [SESSION_MANAGER] Error checking session existence
2025-07-26T08:27:22.2039679Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.2044517Z Expected: true
2025-07-26T08:27:22.2044833Z   Actual: <false>
2025-07-26T08:27:22.2045035Z 
2025-07-26T08:27:22.2045252Z package:matcher                                     expect
2025-07-26T08:27:22.2046093Z package:flutter_test/src/widget_tester.dart 480:18  expect
2025-07-26T08:27:22.2046790Z test/unit/services/session_manager_test.dart 241:9  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.2047622Z ##[endgroup]
2025-07-26T08:27:22.2068341Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager hasSession should return false when no session exists
2025-07-26T08:27:22.2069914Z [LogLevel.error] [SESSION_MANAGER] Error checking session existence
2025-07-26T08:27:22.2075243Z   Data: {"exception":"Binding has not yet been initialized.\nThe \"instance\" getter on the ServicesBinding binding mixin is only available once that binding has been initialized.\nTypically, this is done by calling \"WidgetsFlutterBinding.ensureInitialized()\" or \"runApp()\" (the latter calls the former). Typically this call is done in the \"void main()\" method. The \"ensureInitialized\" method is idempotent; calling it multiple times is not harmful. After calling that method, the \"instance\" getter will return the binding.\nIn a test, one can call \"TestWidgetsFlutterBinding.ensureInitialized()\" as the first line in the test's \"main()\" method to initialize the binding.\nIf ServicesBinding is a custom binding mixin, there must also be a custom binding class, like WidgetsFlutterBinding, but that mixes in the selected binding, and that is the class that must be constructed before using the \"instance\" getter."}
2025-07-26T08:27:22.2080596Z ##[endgroup]
2025-07-26T08:27:22.2096118Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager hasSession should return false when storage throws exception
2025-07-26T08:27:22.2168852Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager updateSessionTokens should update tokens when current session exists (failed)
2025-07-26T08:27:22.2170044Z Expected: true
2025-07-26T08:27:22.2170228Z   Actual: <false>
2025-07-26T08:27:22.2170340Z 
2025-07-26T08:27:22.2170474Z package:matcher                                     expect
2025-07-26T08:27:22.2170817Z package:flutter_test/src/widget_tester.dart 480:18  expect
2025-07-26T08:27:22.2171293Z test/unit/services/session_manager_test.dart 311:9  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.2172136Z ##[endgroup]
2025-07-26T08:27:22.2198884Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager updateSessionTokens should return error when no current session exists
2025-07-26T08:27:22.2247757Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager cleanupExpiredSessions should clear expired session (failed)
2025-07-26T08:27:22.2249001Z No matching calls (actually, no calls at all).
2025-07-26T08:27:22.2249387Z (If you called `verify(...).called(0);`, please instead use `verifyNever(...);`.)
2025-07-26T08:27:22.2249790Z package:matcher                                      fail
2025-07-26T08:27:22.2250202Z package:mockito/src/mock.dart 797:7                  _VerifyCall._checkWith
2025-07-26T08:27:22.2250983Z package:mockito/src/mock.dart 1071:18                _makeVerify.<fn>
2025-07-26T08:27:22.2251742Z test/unit/services/session_manager_test.dart 358:15  main.<fn>.<fn>.<fn>
2025-07-26T08:27:22.2252556Z ##[endgroup]
2025-07-26T08:27:22.2273569Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager cleanupExpiredSessions should do nothing when no session exists
2025-07-26T08:27:22.2301535Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager cleanupExpiredSessions should handle exceptions gracefully
2025-07-26T08:27:22.8018545Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament constructor creates tournament with all required properties
2025-07-26T08:27:22.8118494Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament fromJson creates tournament from valid JSON
2025-07-26T08:27:22.8143332Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament fromJson handles null teams gracefully
2025-07-26T08:27:22.8167851Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament fromJson handles missing last_updated gracefully
2025-07-26T08:27:22.8192541Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament toJson converts tournament to valid JSON
2025-07-26T08:27:22.8233639Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament equality returns true for identical tournaments
2025-07-26T08:27:22.8254058Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament equality returns false for different tournaments
2025-07-26T08:27:22.8278507Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Tournament toString returns readable string representation
2025-07-26T08:27:22.8296862Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: TournamentStatus fromString returns correct status
2025-07-26T08:27:22.8331925Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: TournamentStatus fromString returns scheduled for unknown status
2025-07-26T08:27:22.8350493Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: TournamentStatus value returns correct string
2025-07-26T08:27:22.8369463Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team constructor creates team with all properties
2025-07-26T08:27:22.8388251Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team fromJson creates team from valid JSON
2025-07-26T08:27:22.8406268Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team fromJson handles null players gracefully
2025-07-26T08:27:22.8424764Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team toJson converts team to valid JSON
2025-07-26T08:27:22.8448088Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team equality returns true for identical teams
2025-07-26T08:27:22.8467863Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team equality returns false for different teams
2025-07-26T08:27:22.8496655Z ✅ /home/runner/work/BeachRef/BeachRef/test/unit/data/models/tournament_test.dart: Team toString returns readable string representation
2025-07-26T08:27:24.2932992Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests UI Elements should display all required UI elements
2025-07-26T08:27:24.3615957Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests UI Elements should display FIVB logo placeholder
2025-07-26T08:27:24.4207275Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests UI Elements should have proper FIVB branding colors
2025-07-26T08:27:24.4655570Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests UI Elements should display form fields with proper validation
2025-07-26T08:27:24.5129865Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests UI Elements should display checkbox for remember me
2025-07-26T08:27:24.6950276Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should allow entering email and password
2025-07-26T08:27:24.8064728Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should toggle remember me checkbox
2025-07-26T08:27:24.9055141Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should show validation errors for empty fields
2025-07-26T08:27:25.1428690Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should handle form submission with valid data (failed)
2025-07-26T08:27:25.1430149Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:25.1430901Z The following TestFailure was thrown running a test:
2025-07-26T08:27:25.1432031Z No matching calls. All calls: MockAuthenticationBloc.stream, MockAuthenticationBloc.state,
2025-07-26T08:27:25.1432934Z MockAuthenticationBloc.stream, [VERIFIED] MockAuthenticationBloc.add(Instance of 'LoginRequested')
2025-07-26T08:27:25.1433496Z (If you called `verify(...).called(0);`, please instead use `verifyNever(...);`.)
2025-07-26T08:27:25.1433756Z 
2025-07-26T08:27:25.1433867Z When the exception was thrown, this was the stack:
2025-07-26T08:27:25.1434188Z #0      fail (package:matcher/src/expect/expect.dart:149:31)
2025-07-26T08:27:25.1434552Z #1      _VerifyCall._checkWith (package:mockito/src/mock.dart:797:7)
2025-07-26T08:27:25.1434956Z #2      _makeVerify.<anonymous closure> (package:mockito/src/mock.dart:1071:18)
2025-07-26T08:27:25.1436369Z #3      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:200:37)
2025-07-26T08:27:25.1437226Z <asynchronous suspension>
2025-07-26T08:27:25.1437648Z #4      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:25.1438076Z <asynchronous suspension>
2025-07-26T08:27:25.1438440Z #5      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:25.1438833Z <asynchronous suspension>
2025-07-26T08:27:25.1439023Z <asynchronous suspension>
2025-07-26T08:27:25.1439247Z (elided one frame from package:stack_trace)
2025-07-26T08:27:25.1439420Z 
2025-07-26T08:27:25.1439497Z The test description was:
2025-07-26T08:27:25.1439739Z   should handle form submission with valid data
2025-07-26T08:27:25.1440209Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:25.1440516Z Test failed. See exception logs above.
2025-07-26T08:27:25.1440848Z The test description was: should handle form submission with valid data
2025-07-26T08:27:25.1441109Z 
2025-07-26T08:27:25.1441321Z ##[endgroup]
2025-07-26T08:27:25.2694726Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should handle form submission with remember me checked
2025-07-26T08:27:25.4128796Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should handle forgot password tap (failed)
2025-07-26T08:27:25.4138994Z 
2025-07-26T08:27:25.4139365Z Warning: A call to tap() with finder "Found 1 widget with text "Forgot your password?": [
2025-07-26T08:27:25.4141433Z   Text("Forgot your password?", inherit: true, color: Color(0xff003366), size: 14.0, dependencies: [DefaultSelectionStyle, DefaultTextStyle, MediaQuery]),
2025-07-26T08:27:25.4142883Z ]" derived an Offset (Offset(400.0, 633.0)) that would not hit test on the specified widget.
2025-07-26T08:27:25.4143902Z Maybe the widget is actually off-screen, or another widget is obscuring it, or the widget cannot receive pointer events.
2025-07-26T08:27:25.4145005Z Indeed, Offset(400.0, 633.0) is outside the bounds of the root of the render tree, Size(800.0, 600.0).
2025-07-26T08:27:25.4152531Z The finder corresponds to this RenderBox: RenderParagraph#8f04d relayoutBoundary=up34
2025-07-26T08:27:25.4154038Z The hit test result at that offset is: HitTestResult(HitTestEntry<HitTestTarget>#bbaf8(_ReusableRenderView#9fc79), HitTestEntry<HitTestTarget>#2bf19(<AutomatedTestWidgetsFlutterBinding>))
2025-07-26T08:27:25.4155539Z #0      WidgetController._getElementPoint (package:flutter_test/src/controller.dart:1941:25)
2025-07-26T08:27:25.4156631Z #1      WidgetController.getCenter (package:flutter_test/src/controller.dart:1792:12)
2025-07-26T08:27:25.4157506Z #2      WidgetController.tap (package:flutter_test/src/controller.dart:1040:18)
2025-07-26T08:27:25.4158870Z #3      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:240:22)
2025-07-26T08:27:25.4160031Z <asynchronous suspension>
2025-07-26T08:27:25.4161099Z #4      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:25.4173128Z <asynchronous suspension>
2025-07-26T08:27:25.4173763Z #5      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:25.4174456Z <asynchronous suspension>
2025-07-26T08:27:25.4175310Z #6      StackZoneSpecification._registerCallback.<anonymous closure> (package:stack_trace/src/stack_zone_specification.dart:114:42)
2025-07-26T08:27:25.4176356Z <asynchronous suspension>
2025-07-26T08:27:25.4176823Z To silence this warning, pass "warnIfMissed: false" to "tap()".
2025-07-26T08:27:25.4177594Z To make this warning fatal, set WidgetController.hitTestWarningShouldBeFatal to true.
2025-07-26T08:27:25.4178132Z 
2025-07-26T08:27:25.4178823Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:25.4179773Z The following TestFailure was thrown running a test:
2025-07-26T08:27:25.4180276Z Expected: exactly one matching candidate
2025-07-26T08:27:25.4180836Z   Actual: _TypeWidgetFinder:<Found 0 widgets with type "SnackBar": []>
2025-07-26T08:27:25.4181451Z    Which: means none were found but one was expected
2025-07-26T08:27:25.4181772Z 
2025-07-26T08:27:25.4181957Z When the exception was thrown, this was the stack:
2025-07-26T08:27:25.4205224Z #4      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:244:9)
2025-07-26T08:27:25.4206582Z <asynchronous suspension>
2025-07-26T08:27:25.4207295Z #5      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:25.4208065Z <asynchronous suspension>
2025-07-26T08:27:25.4208688Z #6      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:25.4209405Z <asynchronous suspension>
2025-07-26T08:27:25.4209755Z <asynchronous suspension>
2025-07-26T08:27:25.4210118Z (elided one frame from package:stack_trace)
2025-07-26T08:27:25.4210417Z 
2025-07-26T08:27:25.4210658Z This was caught by the test expectation on the following line:
2025-07-26T08:27:25.4211578Z   file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart line 244
2025-07-26T08:27:25.4220978Z The test description was:
2025-07-26T08:27:25.4221369Z   should handle forgot password tap
2025-07-26T08:27:25.4222181Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:25.4222706Z Test failed. See exception logs above.
2025-07-26T08:27:25.4224479Z The test description was: should handle forgot password tap
2025-07-26T08:27:25.4224880Z 
2025-07-26T08:27:25.4225275Z ##[endgroup]
2025-07-26T08:27:28.7315838Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests BLoC State Handling should show loading indicator when authentication is loading (failed)
2025-07-26T08:27:28.7317850Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:28.7318537Z The following assertion was thrown running a test:
2025-07-26T08:27:28.7318850Z pumpAndSettle timed out
2025-07-26T08:27:28.7318987Z 
2025-07-26T08:27:28.7319110Z When the exception was thrown, this was the stack:
2025-07-26T08:27:28.7319619Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:28.7320107Z <asynchronous suspension>
2025-07-26T08:27:28.7320527Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:28.7320979Z <asynchronous suspension>
2025-07-26T08:27:28.7321669Z #2      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:257:9)
2025-07-26T08:27:28.7322419Z <asynchronous suspension>
2025-07-26T08:27:28.7322846Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:28.7323304Z <asynchronous suspension>
2025-07-26T08:27:28.7323687Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:28.7324103Z <asynchronous suspension>
2025-07-26T08:27:28.7324308Z <asynchronous suspension>
2025-07-26T08:27:28.7324537Z (elided one frame from package:stack_trace)
2025-07-26T08:27:28.7324729Z 
2025-07-26T08:27:28.7324805Z The test description was:
2025-07-26T08:27:28.7325079Z   should show loading indicator when authentication is loading
2025-07-26T08:27:28.7325579Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:28.7326342Z Test failed. See exception logs above.
2025-07-26T08:27:28.7326730Z The test description was: should show loading indicator when authentication is loading
2025-07-26T08:27:28.7327049Z 
2025-07-26T08:27:28.7327294Z ##[endgroup]
2025-07-26T08:27:28.7969322Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests BLoC State Handling should display error message when authentication fails
2025-07-26T08:27:30.8420353Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests BLoC State Handling should disable form fields during loading (failed)
2025-07-26T08:27:30.8421586Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:30.8422027Z The following assertion was thrown running a test:
2025-07-26T08:27:30.8422325Z pumpAndSettle timed out
2025-07-26T08:27:30.8422459Z 
2025-07-26T08:27:30.8422576Z When the exception was thrown, this was the stack:
2025-07-26T08:27:30.8423097Z #0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
2025-07-26T08:27:30.8423576Z <asynchronous suspension>
2025-07-26T08:27:30.8423989Z #1      TestAsyncUtils.guard.<anonymous closure> (package:flutter_test/src/test_async_utils.dart:120:7)
2025-07-26T08:27:30.8424422Z <asynchronous suspension>
2025-07-26T08:27:30.8425061Z #2      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:294:9)
2025-07-26T08:27:30.8426621Z <asynchronous suspension>
2025-07-26T08:27:30.8427038Z #3      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:30.8427479Z <asynchronous suspension>
2025-07-26T08:27:30.8427860Z #4      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:30.8428259Z <asynchronous suspension>
2025-07-26T08:27:30.8428478Z <asynchronous suspension>
2025-07-26T08:27:30.8428821Z (elided one frame from package:stack_trace)
2025-07-26T08:27:30.8429459Z 
2025-07-26T08:27:30.8429557Z The test description was:
2025-07-26T08:27:30.8429797Z   should disable form fields during loading
2025-07-26T08:27:30.8430262Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:30.8430581Z Test failed. See exception logs above.
2025-07-26T08:27:30.8430917Z The test description was: should disable form fields during loading
2025-07-26T08:27:30.8431162Z 
2025-07-26T08:27:30.8431428Z ##[endgroup]
2025-07-26T08:27:30.9067749Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests BLoC State Handling should handle successful authentication state
2025-07-26T08:27:31.0241578Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Accessibility should have proper semantics for screen readers (failed)
2025-07-26T08:27:31.0244001Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:31.0246519Z The following TestFailure was thrown running a test:
2025-07-26T08:27:31.0247014Z Expected: exactly one matching candidate
2025-07-26T08:27:31.0247709Z   Actual: _ElementPredicateWidgetFinder:<Found 0 widgets with element matching predicate: []>
2025-07-26T08:27:31.0248489Z    Which: means none were found but one was expected
2025-07-26T08:27:31.0248800Z 
2025-07-26T08:27:31.0248970Z When the exception was thrown, this was the stack:
2025-07-26T08:27:31.0250177Z #4      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:335:9)
2025-07-26T08:27:31.0251287Z <asynchronous suspension>
2025-07-26T08:27:31.0252011Z #5      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:31.0252830Z <asynchronous suspension>
2025-07-26T08:27:31.0253506Z #6      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:31.0254223Z <asynchronous suspension>
2025-07-26T08:27:31.0254565Z <asynchronous suspension>
2025-07-26T08:27:31.0254933Z (elided one frame from package:stack_trace)
2025-07-26T08:27:31.0255225Z 
2025-07-26T08:27:31.0255965Z This was caught by the test expectation on the following line:
2025-07-26T08:27:31.0256916Z   file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart line 335
2025-07-26T08:27:31.0257697Z The test description was:
2025-07-26T08:27:31.0258090Z   should have proper semantics for screen readers
2025-07-26T08:27:31.0258947Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:31.0259458Z Test failed. See exception logs above.
2025-07-26T08:27:31.0260026Z The test description was: should have proper semantics for screen readers
2025-07-26T08:27:31.0260483Z 
2025-07-26T08:27:31.0260847Z ##[endgroup]
2025-07-26T08:27:31.1334763Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Accessibility should support keyboard navigation (failed)
2025-07-26T08:27:31.1337599Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:31.1338551Z The following TestFailure was thrown running a test:
2025-07-26T08:27:31.1339367Z Expected: RenderMouseRegion:<RenderMouseRegion#29467 relayoutBoundary=up22>
2025-07-26T08:27:31.1341180Z   Actual: RenderPointerListener:<RenderPointerListener#5c528 relayoutBoundary=up32>
2025-07-26T08:27:31.1341744Z 
2025-07-26T08:27:31.1341947Z When the exception was thrown, this was the stack:
2025-07-26T08:27:31.1343179Z #4      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:353:9)
2025-07-26T08:27:31.1344394Z <asynchronous suspension>
2025-07-26T08:27:31.1345140Z #5      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:31.1346139Z <asynchronous suspension>
2025-07-26T08:27:31.1346800Z #6      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:31.1347512Z <asynchronous suspension>
2025-07-26T08:27:31.1347874Z <asynchronous suspension>
2025-07-26T08:27:31.1348254Z (elided one frame from package:stack_trace)
2025-07-26T08:27:31.1348555Z 
2025-07-26T08:27:31.1348809Z This was caught by the test expectation on the following line:
2025-07-26T08:27:31.1349782Z   file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart line 353
2025-07-26T08:27:31.1350655Z The test description was:
2025-07-26T08:27:31.1351032Z   should support keyboard navigation
2025-07-26T08:27:31.1352093Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:31.1352641Z Test failed. See exception logs above.
2025-07-26T08:27:31.1353178Z The test description was: should support keyboard navigation
2025-07-26T08:27:31.1353579Z 
2025-07-26T08:27:31.1353957Z ##[endgroup]
2025-07-26T08:27:31.2639015Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Responsive Design should adapt to different screen sizes (failed)
2025-07-26T08:27:31.2640586Z ══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
2025-07-26T08:27:31.2641149Z The following TestFailure was thrown running a test:
2025-07-26T08:27:31.2641661Z Expected: exactly one matching candidate
2025-07-26T08:27:31.2642241Z   Actual: _TypeWidgetFinder:<Found 7 widgets with type "ConstrainedBox": [
2025-07-26T08:27:31.2643014Z             ConstrainedBox(BoxConstraints(biggest), renderObject: RenderConstrainedBox#0dcc6),
2025-07-26T08:27:31.2643839Z             ConstrainedBox(BoxConstraints(0.0<=w<=400.0, 0.0<=h<=Infinity), renderObject:
2025-07-26T08:27:31.2644456Z RenderConstrainedBox#0054d relayoutBoundary=up12),
2025-07-26T08:27:31.2645172Z             ConstrainedBox(BoxConstraints(w=80.0, h=80.0), renderObject: RenderConstrainedBox#95ff2
2025-07-26T08:27:31.2646094Z relayoutBoundary=up22),
2025-07-26T08:27:31.2646642Z             ConstrainedBox(BoxConstraints(48.0<=w<=Infinity, 48.0<=h<=Infinity), renderObject:
2025-07-26T08:27:31.2647338Z RenderConstrainedBox#f53e0 relayoutBoundary=up30),
2025-07-26T08:27:31.2648032Z             ConstrainedBox(BoxConstraints(48.0<=w<=Infinity, 48.0<=h<=Infinity), renderObject:
2025-07-26T08:27:31.2648734Z RenderConstrainedBox#4c665 relayoutBoundary=up30),
2025-07-26T08:27:31.2649456Z             ConstrainedBox(BoxConstraints(64.0<=w<=Infinity, 40.0<=h<=Infinity), renderObject:
2025-07-26T08:27:31.2650116Z RenderConstrainedBox#b8112),
2025-07-26T08:27:31.2650660Z             ConstrainedBox(BoxConstraints(64.0<=w<=Infinity, 40.0<=h<=Infinity), renderObject:
2025-07-26T08:27:31.2651733Z RenderConstrainedBox#7e0fd relayoutBoundary=up24),
2025-07-26T08:27:31.2652180Z           ]>
2025-07-26T08:27:31.2652413Z    Which: is too many
2025-07-26T08:27:31.2652609Z 
2025-07-26T08:27:31.2652787Z When the exception was thrown, this was the stack:
2025-07-26T08:27:31.2653839Z #4      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart:369:9)
2025-07-26T08:27:31.2654843Z <asynchronous suspension>
2025-07-26T08:27:31.2655482Z #5      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
2025-07-26T08:27:31.2656410Z <asynchronous suspension>
2025-07-26T08:27:31.2657001Z #6      TestWidgetsFlutterBinding._runTestBody (package:flutter_test/src/binding.dart:1032:5)
2025-07-26T08:27:31.2657621Z <asynchronous suspension>
2025-07-26T08:27:31.2657968Z <asynchronous suspension>
2025-07-26T08:27:31.2658337Z (elided one frame from package:stack_trace)
2025-07-26T08:27:31.2658604Z 
2025-07-26T08:27:31.2658828Z This was caught by the test expectation on the following line:
2025-07-26T08:27:31.2659678Z   file:///home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart line 369
2025-07-26T08:27:31.2660410Z The test description was:
2025-07-26T08:27:31.2660749Z   should adapt to different screen sizes
2025-07-26T08:27:31.2661483Z ════════════════════════════════════════════════════════════════════════════════════════════════════
2025-07-26T08:27:31.2661983Z Test failed. See exception logs above.
2025-07-26T08:27:31.2662458Z The test description was: should adapt to different screen sizes
2025-07-26T08:27:31.2662826Z 
2025-07-26T08:27:31.2663148Z ##[endgroup]
2025-07-26T08:27:31.2993994Z ✅ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Responsive Design should handle landscape orientation
2025-07-26T08:27:32.0619966Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/integration/authentication_flow_test.dart: (setUpAll) (failed)
2025-07-26T08:27:32.0621327Z MissingPluginException(No implementation found for method getAll on channel plugins.flutter.io/shared_preferences)
2025-07-26T08:27:32.0623736Z dart:async                                                           _Completer.completeError
2025-07-26T08:27:32.0624892Z package:shared_preferences/src/shared_preferences_legacy.dart 91:19  SharedPreferences.getInstance
2025-07-26T08:27:32.0626179Z ===== asynchronous gap ===========================
2025-07-26T08:27:32.0628610Z dart:async                                                           _CustomZone.registerBinaryCallback
2025-07-26T08:27:32.0629542Z package:shared_preferences/src/shared_preferences_legacy.dart 86:13  SharedPreferences.getInstance
2025-07-26T08:27:32.0630739Z package:supabase_flutter/src/local_storage.dart 129:38               SharedPreferencesGotrueAsyncStorage._initialize
2025-07-26T08:27:32.0631967Z package:supabase_flutter/src/local_storage.dart 120:5                new SharedPreferencesGotrueAsyncStorage
2025-07-26T08:27:32.0633022Z package:supabase_flutter/src/supabase.dart 109:27                    Supabase.initialize
2025-07-26T08:27:32.0633930Z test/helpers/test_helper.dart 15:18                                  initializeSupabaseForTesting
2025-07-26T08:27:32.0634793Z test/integration/authentication_flow_test.dart 13:11                 main.<fn>
2025-07-26T08:27:32.0636090Z MissingPluginException(No implementation found for method getAll on channel plugins.flutter.io/shared_preferences)
2025-07-26T08:27:32.0637072Z dart:async                                                           _Completer.completeError
2025-07-26T08:27:32.0637955Z package:shared_preferences/src/shared_preferences_legacy.dart 91:19  SharedPreferences.getInstance
2025-07-26T08:27:32.0638757Z ===== asynchronous gap ===========================
2025-07-26T08:27:32.0639328Z dart:async                                                           _CustomZone.registerBinaryCallback
2025-07-26T08:27:32.0640589Z package:shared_preferences/src/shared_preferences_legacy.dart 86:13  SharedPreferences.getInstance
2025-07-26T08:27:32.0641769Z package:supabase_flutter/src/local_storage.dart 129:38               SharedPreferencesGotrueAsyncStorage._initialize
2025-07-26T08:27:32.0642917Z package:supabase_flutter/src/local_storage.dart 120:5                new SharedPreferencesGotrueAsyncStorage
2025-07-26T08:27:32.0643960Z package:supabase_flutter/src/supabase.dart 109:27                    Supabase.initialize
2025-07-26T08:27:32.0644884Z test/helpers/test_helper.dart 15:18                                  initializeSupabaseForTesting
2025-07-26T08:27:32.0645938Z test/integration/authentication_flow_test.dart 13:11                 main.<fn>
2025-07-26T08:27:32.0646819Z ##[endgroup]
2025-07-26T08:27:32.0894491Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/integration/authentication_flow_test.dart: (tearDownAll)
2025-07-26T08:27:32.0895902Z Warning: integration_test plugin was not detected.
2025-07-26T08:27:32.0896275Z 
2025-07-26T08:27:32.0896557Z If you're running the tests with `flutter drive`, please make sure your tests
2025-07-26T08:27:32.0897219Z are in the `integration_test/` directory of your package and use
2025-07-26T08:27:32.0897812Z `flutter test $path_to_test` to run it instead.
2025-07-26T08:27:32.0898154Z 
2025-07-26T08:27:32.0898472Z If you're running the tests with Android instrumentation or XCTest, this means
2025-07-26T08:27:32.0899197Z that you are not capturing test results properly! See the following link for
2025-07-26T08:27:32.0899798Z how to set up the integration_test plugin:
2025-07-26T08:27:32.0900070Z 
2025-07-26T08:27:32.0900295Z https://docs.flutter.dev/testing/integration-tests
2025-07-26T08:27:32.0900663Z 
2025-07-26T08:27:32.0900988Z ##[endgroup]
2025-07-26T08:27:36.8171791Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests getTournaments should return cached data when available (failed)
2025-07-26T08:27:36.8173067Z [VIS Service] Cache cleared
2025-07-26T08:27:36.8173368Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:27:36.8173764Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:36.8174295Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:36.8174696Z   CorrelationId: corr_1753518441796_27
2025-07-26T08:27:36.8175204Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:27:36.8175594Z [VIS Service] Response status: 200
2025-07-26T08:27:36.8176108Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:36.8176552Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:27:36.8176958Z   CorrelationId: corr_1753518441796_26
2025-07-26T08:27:36.8177262Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:27:36.8177656Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:36.8178076Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":0}
2025-07-26T08:27:36.8178608Z   CorrelationId: corr_1753518441800_29
2025-07-26T08:27:36.8178916Z [VIS Service] Retrying API call (attempt 1)
2025-07-26T08:27:36.8179265Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:36.8179661Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":1}
2025-07-26T08:27:36.8179980Z   CorrelationId: corr_1753518442803_31
2025-07-26T08:27:36.8180220Z [VIS Service] Retrying API call (attempt 2)
2025-07-26T08:27:36.8180553Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:36.8180949Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":3}
2025-07-26T08:27:36.8181266Z   CorrelationId: corr_1753518444806_33
2025-07-26T08:27:36.8181518Z [VIS Service] Retrying API call (attempt 3)
2025-07-26T08:27:36.8182130Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:36.8182559Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":7}
2025-07-26T08:27:36.8182873Z   CorrelationId: corr_1753518448809_35
2025-07-26T08:27:36.8183188Z [VIS Service] Retrying API call (attempt 4)
2025-07-26T08:27:36.8183791Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:36.8184545Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":15}
2025-07-26T08:27:36.8185132Z   CorrelationId: corr_1753518456811_37
2025-07-26T08:27:36.8185529Z [VIS Service] Cache cleared
2025-07-26T08:27:36.8185970Z Expected: true
2025-07-26T08:27:36.8186155Z   Actual: <false>
2025-07-26T08:27:36.8186271Z 
2025-07-26T08:27:36.8186424Z package:matcher                                             expect
2025-07-26T08:27:36.8186794Z package:flutter_test/src/widget_tester.dart 480:18          expect
2025-07-26T08:27:36.8187476Z test/unit/services/vis_integration_service_test.dart 149:9  main.<fn>.<fn>.<fn>
2025-07-26T08:27:36.8188010Z ##[endgroup]
2025-07-26T08:27:36.8236754Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests getTournaments should handle authentication errors
2025-07-26T08:27:36.8238050Z [VIS Service] Cache cleared
2025-07-26T08:27:36.8238542Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:27:36.8239240Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:36.8239926Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:36.8240462Z   CorrelationId: corr_1753518456819_39
2025-07-26T08:27:36.8241091Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:27:36.8241771Z [VIS Service] Response status: 401
2025-07-26T08:27:36.8242267Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:36.8243072Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":401,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:27:36.8243808Z   CorrelationId: corr_1753518456819_38
2025-07-26T08:27:36.8244240Z [VIS Service] Cache cleared
2025-07-26T08:27:36.8244851Z ##[endgroup]
2025-07-26T08:27:51.8402933Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests getTournaments should handle rate limit errors (failed)
2025-07-26T08:27:51.8404262Z [VIS Service] Cache cleared
2025-07-26T08:27:51.8404780Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:27:51.8405433Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:27:51.8406317Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:27:51.8406859Z   CorrelationId: corr_1753518456825_41
2025-07-26T08:27:51.8407498Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:27:51.8408119Z [VIS Service] Response status: 429
2025-07-26T08:27:51.8408563Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:27:51.8409158Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":429,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:27:51.8409778Z   CorrelationId: corr_1753518456825_40
2025-07-26T08:27:51.8410212Z [VIS Service] Retrying API call (attempt 1)
2025-07-26T08:27:51.8410806Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:51.8411464Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":1}
2025-07-26T08:27:51.8411969Z   CorrelationId: corr_1753518457827_43
2025-07-26T08:27:51.8412345Z [VIS Service] Retrying API call (attempt 2)
2025-07-26T08:27:51.8412869Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:51.8413590Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":3}
2025-07-26T08:27:51.8414162Z   CorrelationId: corr_1753518459830_45
2025-07-26T08:27:51.8414975Z [VIS Service] Retrying API call (attempt 3)
2025-07-26T08:27:51.8415604Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:51.8416569Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":7}
2025-07-26T08:27:51.8417124Z   CorrelationId: corr_1753518463832_47
2025-07-26T08:27:51.8417576Z [VIS Service] Retrying API call (attempt 4)
2025-07-26T08:27:51.8418195Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:27:51.8418931Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":15}
2025-07-26T08:27:51.8419541Z   CorrelationId: corr_1753518471834_49
2025-07-26T08:27:51.8419955Z [VIS Service] Cache cleared
2025-07-26T08:27:51.8420371Z Expected: <Instance of 'VisRateLimitError'>
2025-07-26T08:27:51.8421338Z   Actual: VisComplianceError:<AppException: FIVB rate limit violation - Must wait 14s before next API call (FIVB requirement: 30s minimum)>
2025-07-26T08:27:51.8422683Z    Which: is not an instance of 'VisRateLimitError'
2025-07-26T08:27:51.8423048Z 
2025-07-26T08:27:51.8423298Z package:matcher                                             expect
2025-07-26T08:27:51.8423933Z package:flutter_test/src/widget_tester.dart 480:18          expect
2025-07-26T08:27:51.8424712Z test/unit/services/vis_integration_service_test.dart 180:9  main.<fn>.<fn>.<fn>
2025-07-26T08:27:51.8425598Z ##[endgroup]
2025-07-26T08:28:06.8577823Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests getTournaments should handle maintenance errors (failed)
2025-07-26T08:28:06.8579194Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8579672Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:06.8580348Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:06.8581056Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:06.8581638Z   CorrelationId: corr_1753518471842_51
2025-07-26T08:28:06.8582304Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:28:06.8582969Z [VIS Service] Response status: 503
2025-07-26T08:28:06.8583445Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:06.8584227Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":503,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:06.8584988Z   CorrelationId: corr_1753518471842_50
2025-07-26T08:28:06.8585443Z [VIS Service] Retrying API call (attempt 1)
2025-07-26T08:28:06.8586456Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:06.8587207Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":1}
2025-07-26T08:28:06.8587770Z   CorrelationId: corr_1753518472846_53
2025-07-26T08:28:06.8588204Z [VIS Service] Retrying API call (attempt 2)
2025-07-26T08:28:06.8588808Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:06.8589562Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":3}
2025-07-26T08:28:06.8590139Z   CorrelationId: corr_1753518474848_55
2025-07-26T08:28:06.8590564Z [VIS Service] Retrying API call (attempt 3)
2025-07-26T08:28:06.8591158Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:06.8591874Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":7}
2025-07-26T08:28:06.8592437Z   CorrelationId: corr_1753518478850_57
2025-07-26T08:28:06.8592873Z [VIS Service] Retrying API call (attempt 4)
2025-07-26T08:28:06.8593586Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:06.8594413Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":15}
2025-07-26T08:28:06.8595014Z   CorrelationId: corr_1753518486852_59
2025-07-26T08:28:06.8595416Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8596017Z Expected: <Instance of 'VisMaintenanceError'>
2025-07-26T08:28:06.8597310Z   Actual: VisComplianceError:<AppException: FIVB rate limit violation - Must wait 14s before next API call (FIVB requirement: 30s minimum)>
2025-07-26T08:28:06.8598324Z    Which: is not an instance of 'VisMaintenanceError'
2025-07-26T08:28:06.8598666Z 
2025-07-26T08:28:06.8598897Z package:matcher                                             expect
2025-07-26T08:28:06.8599548Z package:flutter_test/src/widget_tester.dart 480:18          expect
2025-07-26T08:28:06.8600328Z test/unit/services/vis_integration_service_test.dart 193:9  main.<fn>.<fn>.<fn>
2025-07-26T08:28:06.8601201Z ##[endgroup]
2025-07-26T08:28:06.8646096Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests getTournaments should handle JSON parsing errors
2025-07-26T08:28:06.8647331Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8647809Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:06.8648725Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:06.8649389Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:06.8649907Z   CorrelationId: corr_1753518486860_61
2025-07-26T08:28:06.8650501Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:28:06.8651128Z [VIS Service] Response status: 200
2025-07-26T08:28:06.8651561Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:06.8652281Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:06.8652957Z   CorrelationId: corr_1753518486860_60
2025-07-26T08:28:06.8653333Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8653874Z ##[endgroup]
2025-07-26T08:28:06.8741020Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests rate limiting should enforce 30-second rate limit (failed)
2025-07-26T08:28:06.8742313Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8742742Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:28:06.8743234Z   CorrelationId: corr_1753518486866_62
2025-07-26T08:28:06.8743773Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:06.8744438Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:06.8744959Z   CorrelationId: corr_1753518486867_64
2025-07-26T08:28:06.8745490Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=1
2025-07-26T08:28:06.8746350Z [VIS Service] Response status: 200
2025-07-26T08:28:06.8747005Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:06.8747916Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:06.8748781Z   CorrelationId: corr_1753518486867_63
2025-07-26T08:28:06.8749417Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:28:06.8750173Z   CorrelationId: corr_1753518486869_65
2025-07-26T08:28:06.8751753Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:06.8752558Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":0}
2025-07-26T08:28:06.8753140Z   CorrelationId: corr_1753518486869_67
2025-07-26T08:28:06.8753560Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8753973Z Expected: <Instance of 'VisRateLimitError'>
2025-07-26T08:28:06.8754863Z   Actual: VisConnectionError:<AppException: Health check failed - Response time: 1ms, Error: FIVB rate limit violation>
2025-07-26T08:28:06.8755980Z    Which: is not an instance of 'VisRateLimitError'
2025-07-26T08:28:06.8756330Z 
2025-07-26T08:28:06.8756569Z package:matcher                                             expect
2025-07-26T08:28:06.8757221Z package:flutter_test/src/widget_tester.dart 480:18          expect
2025-07-26T08:28:06.8758020Z test/unit/services/vis_integration_service_test.dart 224:9  main.<fn>.<fn>.<fn>
2025-07-26T08:28:06.8758923Z ##[endgroup]
2025-07-26T08:28:06.8869920Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests retry logic should retry on network errors (failed)
2025-07-26T08:28:06.8870986Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8871443Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:06.8872130Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:06.8872560Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:06.8873112Z   CorrelationId: corr_1753518486876_69
2025-07-26T08:28:06.8873553Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:28:06.8873956Z [VIS Service] Response status: 200
2025-07-26T08:28:06.8874230Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:06.8874666Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:06.8875270Z   CorrelationId: corr_1753518486876_68
2025-07-26T08:28:06.8875513Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8875929Z Expected: <2>
2025-07-26T08:28:06.8876135Z   Actual: <1>
2025-07-26T08:28:06.8876301Z Unexpected number of calls
2025-07-26T08:28:06.8876431Z 
2025-07-26T08:28:06.8876570Z package:matcher                                              expect
2025-07-26T08:28:06.8877147Z package:mockito/src/mock.dart 995:5                          VerificationResult.called
2025-07-26T08:28:06.8878166Z test/unit/services/vis_integration_service_test.dart 243:67  main.<fn>.<fn>.<fn>
2025-07-26T08:28:06.8878704Z ##[endgroup]
2025-07-26T08:28:06.8918925Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests retry logic should not retry on client errors
2025-07-26T08:28:06.8920209Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8920701Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:06.8921277Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:06.8921699Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:06.8922016Z   CorrelationId: corr_1753518486888_71
2025-07-26T08:28:06.8922383Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:28:06.8922764Z [VIS Service] Response status: 401
2025-07-26T08:28:06.8923027Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:06.8923458Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":401,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:06.8923900Z   CorrelationId: corr_1753518486888_70
2025-07-26T08:28:06.8924282Z [VIS Service] Cache cleared
2025-07-26T08:28:06.8924625Z ##[endgroup]
2025-07-26T08:28:21.9102419Z ##[group]❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests cache management should clear cache when requested (failed)
2025-07-26T08:28:21.9103733Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9104037Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:21.9104426Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:21.9104846Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:21.9105343Z   CorrelationId: corr_1753518486893_73
2025-07-26T08:28:21.9105975Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:28:21.9106379Z [VIS Service] Response status: 200
2025-07-26T08:28:21.9106656Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:21.9107104Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:21.9107513Z   CorrelationId: corr_1753518486893_72
2025-07-26T08:28:21.9107754Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9108026Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:21.9108434Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:21.9109229Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":0}
2025-07-26T08:28:21.9109841Z   CorrelationId: corr_1753518486896_75
2025-07-26T08:28:21.9110271Z [VIS Service] Retrying API call (attempt 1)
2025-07-26T08:28:21.9110829Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:21.9111475Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":1}
2025-07-26T08:28:21.9111981Z   CorrelationId: corr_1753518487898_77
2025-07-26T08:28:21.9112366Z [VIS Service] Retrying API call (attempt 2)
2025-07-26T08:28:21.9112931Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:21.9113680Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":3}
2025-07-26T08:28:21.9114259Z   CorrelationId: corr_1753518489900_79
2025-07-26T08:28:21.9114975Z [VIS Service] Retrying API call (attempt 3)
2025-07-26T08:28:21.9115580Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:21.9116467Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":7}
2025-07-26T08:28:21.9117061Z   CorrelationId: corr_1753518493902_81
2025-07-26T08:28:21.9117486Z [VIS Service] Retrying API call (attempt 4)
2025-07-26T08:28:21.9118082Z [LogLevel.warning] [FIVB_COMPLIANCE] FIVB rate limit violation prevented
2025-07-26T08:28:21.9118840Z   Data: {"endpoint":"/tournaments","method":"GET","timeSinceLastCall":15}
2025-07-26T08:28:21.9119444Z   CorrelationId: corr_1753518501904_83
2025-07-26T08:28:21.9119855Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9120198Z Expected: <2>
2025-07-26T08:28:21.9120486Z   Actual: <1>
2025-07-26T08:28:21.9120786Z Unexpected number of calls
2025-07-26T08:28:21.9121026Z 
2025-07-26T08:28:21.9121265Z package:matcher                                              expect
2025-07-26T08:28:21.9121990Z package:mockito/src/mock.dart 995:5                          VerificationResult.called
2025-07-26T08:28:21.9122869Z test/unit/services/vis_integration_service_test.dart 275:67  main.<fn>.<fn>.<fn>
2025-07-26T08:28:21.9123751Z ##[endgroup]
2025-07-26T08:28:21.9135622Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests FIVB compliance should provide compliance statistics
2025-07-26T08:28:21.9136713Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9137009Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9137338Z ##[endgroup]
2025-07-26T08:28:21.9166501Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests FIVB compliance should generate usage report
2025-07-26T08:28:21.9167293Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9167655Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9168003Z ##[endgroup]
2025-07-26T08:28:21.9219053Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests FIVB compliance should handle invalid tournament data gracefully
2025-07-26T08:28:21.9220456Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9220948Z [VIS Service] Fetching tournaments (limit: 50, filter: null)
2025-07-26T08:28:21.9221643Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:21.9222339Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:21.9222892Z   CorrelationId: corr_1753518501918_85
2025-07-26T08:28:21.9223533Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=50
2025-07-26T08:28:21.9224201Z [VIS Service] Response status: 200
2025-07-26T08:28:21.9224665Z [LogLevel.info] [FIVB_AUDIT] FIVB API call recorded
2025-07-26T08:28:21.9225467Z   Data: {"endpoint":"/tournaments","method":"GET","statusCode":200,"responseTimeMs":1,"totalApiCalls":1}
2025-07-26T08:28:21.9226433Z   CorrelationId: corr_1753518501918_84
2025-07-26T08:28:21.9227052Z [LogLevel.warning] [VIS_SERVICE] FIVB data validation failed for tournament
2025-07-26T08:28:21.9227971Z   Data: {"tournamentId":"1"}
2025-07-26T08:28:21.9228371Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9228956Z ##[endgroup]
2025-07-26T08:28:21.9249008Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests initialization should initialize service correctly
2025-07-26T08:28:21.9250281Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9250555Z [VIS Service] VIS Integration Service initialized
2025-07-26T08:28:21.9250879Z [VIS Service] Base URL: https://www.vis.sport/api
2025-07-26T08:28:21.9251164Z [VIS Service] API Key configured: false
2025-07-26T08:28:21.9251405Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9251741Z ##[endgroup]
2025-07-26T08:28:21.9298546Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests error handling edge cases should handle network timeout properly
2025-07-26T08:28:21.9300248Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9300789Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:28:21.9309710Z   CorrelationId: corr_1753518501926_86
2025-07-26T08:28:21.9310339Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:21.9311082Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:21.9311563Z   CorrelationId: corr_1753518501926_88
2025-07-26T08:28:21.9311940Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=1
2025-07-26T08:28:21.9312316Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9312671Z ##[endgroup]
2025-07-26T08:28:21.9343342Z ##[group]✅ /home/runner/work/BeachRef/BeachRef/test/unit/services/vis_integration_service_test.dart: VisIntegrationService Tests error handling edge cases should handle unexpected exceptions
2025-07-26T08:28:21.9344604Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9345090Z [LogLevel.info] [VIS_SERVICE] Starting VIS health check
2025-07-26T08:28:21.9345627Z   CorrelationId: corr_1753518501931_89
2025-07-26T08:28:21.9346516Z [LogLevel.info] [FIVB_COMPLIANCE] FIVB API call validated successfully
2025-07-26T08:28:21.9347255Z   Data: {"endpoint":"/tournaments","method":"GET","apiCallCount":0}
2025-07-26T08:28:21.9347791Z   CorrelationId: corr_1753518501931_91
2025-07-26T08:28:21.9348374Z [VIS Service] Making GET request to: https://www.vis.sport/api/tournaments?limit=1
2025-07-26T08:28:21.9348974Z [VIS Service] Cache cleared
2025-07-26T08:28:21.9349529Z ##[endgroup]
2025-07-26T08:28:21.9551702Z 
2025-07-26T08:28:21.9583679Z ##[error]90 tests passed, 61 failed.
2025-07-26T08:28:22.0308306Z ##[error]Process completed with exit code 1.
2025-07-26T08:28:22.0443455Z Post job cleanup.
2025-07-26T08:28:22.0508750Z Post job cleanup.
2025-07-26T08:28:22.1436214Z [command]/usr/bin/git version
2025-07-26T08:28:22.1475040Z git version 2.50.1
2025-07-26T08:28:22.1524370Z Temporarily overriding HOME='/home/runner/work/_temp/1098a9a1-e676-448e-a1a9-361216bfbff5' before making global git config changes
2025-07-26T08:28:22.1525842Z Adding repository directory to the temporary git global config as a safe directory
2025-07-26T08:28:22.1530548Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/BeachRef/BeachRef
2025-07-26T08:28:22.1566013Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-26T08:28:22.1599263Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-26T08:28:22.1829624Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-26T08:28:22.1849858Z http.https://github.com/.extraheader
2025-07-26T08:28:22.1862828Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-07-26T08:28:22.1893188Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-26T08:28:22.2220529Z Cleaning up orphan processes
