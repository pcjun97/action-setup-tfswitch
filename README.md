# Setup tfswitch

Sets up tfswitch in a Github Actions workflow.

## Input variables

See action.yml for more detailed information.

- `tag` - (Optional) Tag from https://github.com/warrensbox/terraform-switcher/releases

## Usage

Default - Download and set up the latest release.
Will also add a `.tfswitch.toml` to the home directory to configure the terraform installation directory.

```yaml
- uses: pcjun97/action-setup-tfswitch@v1.0.0
- run: tfswitch 1.2.0
```

Alternatively, specify a specific version of tfswitch to install.

```yaml
- uses: pcjun97/action-setup-tfswitch@v1.0.0
  with:
    tag: 0.13.1275

- run: tfswitch 1.0.0
```
