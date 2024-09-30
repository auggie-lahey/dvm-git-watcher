# DVM git Watcher

A Nostr DVM for watching a NIP-34 repository and triggering subsequent processes.

### Docker build

```bash
# For building on Mac with M1/2/3 chip include --platform linux/amd64 to create an amd build
docker build --platform linux/amd64 . -t dvm-git-watcher

# To store docker image as tarball 
docker save dvm-git-watcher > dvm-git-watcher.tar
```


