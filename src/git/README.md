# `src/git`

In-memory Git repository simulation, operation recording/playback, and deterministic PRNG utilities.

## Subdirectories

- [`render/`](./render/README.md) - Graph layout algorithm and SVG rendering.

## Files

- [`repo.ts`](./repo.ts) - In-memory Git repository model (`Repo`, `Commit`, `Ref`, `ReadonlyRepo`).
- [`recorder.ts`](./recorder.ts) - Command recording (`GitRecorder`), step-by-step playback (`GitPlayback`), and command hierarchy (`GitOperation`).
- [`random.ts`](./random.ts) - Seedable pseudo-random number generator (`SplitMix32`) and string hashing.

---

## Major Interfaces & Classes

### Repository Model ([`repo.ts`](./repo.ts))

#### `interface Commit`

Represents an immutable snapshot in the commit graph.

- `msg: string`: Commit log message.
- `sha1: string`: Short hexadecimal commit hash.
- `commitTime: number`: Logical timestamp incremented with each commit.
- `parents: ReadonlyArray<Commit>`: Direct parent commits (0 for initial, 1 for standard, 2+ for merge).
- `tags: ReadonlyArray<string>`: Tags pointing directly to this commit.
- `branchChildren(): Commit[]`: Children along standard branch histories (excluding merge second parents).
- `mergeChildren(): Commit[]`: Children where this commit was merged into another branch.

#### `interface ReadonlyRepo`

Read-only view of a repository state used by renderers and layout engines.

- `head: Commit`: Current HEAD commit.
- `currentBranch?: string`: Name of active branch, or `undefined` if in detached HEAD state.
- `commits: ReadonlyArray<Commit>`: All commits in creation order.
- `tags: ReadonlyMap<string, Commit>`: Map of tag names to commits.
- `branches: ReadonlyMap<string, Commit>`: Map of branch names to tip commits.
- `getCommit(ref: string): Commit | undefined`: Resolves a commit by SHA-1, branch name, or tag name.
- `temporalTopologicalWalk(callback: (commit: Commit) => void): void`: DFS walk from latest to earliest commits, visiting children before parents.
- `onCommitCreated(handlerFn: (payload: Commit) => void)`: Event subscription when new commits are created.
- `onCommitRefsUpdated(handlerFn: (payload: Commit) => void)`: Event subscription when branches, tags, or HEAD update.

#### `class Repo implements ReadonlyRepo`

In-memory Git simulator seeded for reproducible commit hashes.

- **Constructor**: `new Repo(seed: string)`
- **Key Operations**:
  - `commit(msg: string, { amend?: boolean }): Commit`: Creates a commit or amends the previous commit.
  - `revert(ref?: string): Commit`: Reverts the target ref by committing a reverse message.
  - `tag(name: string): Commit`: Tags the current `HEAD`.
  - `branch(name: string): void`: Creates a new branch pointing to `HEAD`.
  - `checkout(ref: string): void`: Checks out a branch name or commit hash (switches to detached HEAD if checking out a SHA).
  - `merge(ref: string): Commit`: Creates a merge commit with two parents (`HEAD` and `ref`).

---

### Command Recording & Playback ([`recorder.ts`](./recorder.ts))

#### `class GitRecorder`

Fluent builder interface used when defining presentation slides to script Git operations.

- **Fluent Methods**:
  - `commit({ msg?, amend? })`
  - `checkout(branch, { createBranch? })`
  - `branch(name)`
  - `merge(ref)`
  - `revert(ref?)`
  - `tag(name)`
  - `pause()`: Marks an explicit transition pause point between operation chunks.
- **Properties**:
  - `singleStepMode: boolean`: When `true`, automatically pauses after every command.
  - `printCommands: boolean`: Controls whether the operation is displayed in the terminal UI code block.
- **Methods**:
  - `replay(): GitPlayback`: Constructs a playback runner with a replica repository.

#### `class GitPlayback`

Step-by-step playback engine driven by slide animations.

- `repo: ReadonlyRepo`: The simulated repository state as of the current step.
- `operations: ReadonlyArray<GitOperation>`: Operations executed so far.
- `peekNextOperations(): ReadonlyArray<GitOperation> | null`: Returns upcoming queued operations without consuming them.
- `hasMoreCommands: boolean`: Indicates whether there are more commands queued to play.
- `hasMoreCommandsAfterNext: boolean`: Indicates whether more commands remain after the upcoming step.
- `play(visitor?: GitOperationVisitor | null): boolean`: Executes the next queued chunk of operations on the repo and visits them. Returns `true` if more chunks remain.

#### `abstract class GitOperation` & Hierarchy

Command pattern representing individual Git commands:

- `execute(repo: Repo): void`: Applies the operation to the target repository.
- `sha1: string`: Resulting HEAD SHA-1 after execution.
- `command: string | null`: Command-line representation (e.g. `git checkout -b feature`).
- `visit(visitor: GitOperationVisitor): void`: Double-dispatch hook for visitors.
- **Subclasses**:
  - `CommitOperation`
  - `RevertOperation`
  - `CheckoutOperation`
  - `BranchOperation`
  - `MergeOperation`
  - `TagOperation`

#### `class GitOperationVisitor`

Visitor pattern interface with hook methods (`visitCommit`, `visitRevert`, `visitCheckout`, `visitBranch`, `visitMerge`, `visitTag`) called during playback execution.

---

### Pseudo-Random Number Generation ([`random.ts`](./random.ts))

- `abstract class Random`: Base contract for `nextFloat()`, `nextInt(min, max)`, and `nextHex(len)`.
- `class SplitMix32 extends Random`: Fast, deterministic PRNG initialized with a 32-bit seed.
- `hash32(str: string): number` / `hash128(str: string): number[]`: Murmur3-style string hashing functions generating deterministic numeric seeds from slide IDs.
