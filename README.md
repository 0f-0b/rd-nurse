# rd-nurse(1)

## Name

rd-nurse - check [Rhythm Doctor](https://rhythmdr.com/) levels for illegal
oneshots and holds.

## Installation

Make sure you [have Deno installed](https://deno.land/#installation), and then
run the following in a terminal:

```shell
deno install -fr https://cdn.jsdelivr.net/gh/0f-0b/rd-nurse@main/main.ts
```

## Synopsis

<pre><code><b>rd-nurse</b> [<i>OPTION</i>]...</code></pre>

## Description

**rd-nurse** reads a level from standard input, and prints the position of any
incorrectly cued oneshots and bad holds found in the level.

## Options

- **`-s`**, **`--ignore-source`**

  Ignore the voice sources of the cue sounds.

- **`-p`**, **`--interruptible-pattern`**

  Allow squareshots to stop oneshot patterns.

- **`-t`**, **`--triangleshot`**

  Treat "two" as a triangleshot cue. By default it is assumed to be a squareshot
  cue.

- **`-h`**, **`--help`**

  Display a summary of options and exit.

## Exit Status

The exit status is 0 if no illegality is found, and 1 otherwise.

## Bugs

Tags, conditionals and custom cue sounds are completely ignored, sometimes
leading to correctly cued oneshots being reported as uncued or miscued.

## See Also

- GitHub repository: <https://github.com/0f-0b/rd-nurse>.
