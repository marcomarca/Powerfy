# General AI Development Skills — C# / .NET / Windows Projects

> General-purpose Markdown for AI-assisted C# and .NET development on Windows. It is an operating contract for coding agents working with the .NET SDK, MSBuild, NuGet, ASP.NET Core, Entity Framework Core, Windows desktop technologies, and ordinary .NET libraries/services.

---

# 0. C# / .NET Project Defaults

## Required tooling

```txt
Default baseline for new projects: .NET 10 LTS
Default language for new .NET 10 projects: C# 14
SDK/runtime/build CLI: dotnet
Build engine: MSBuild through dotnet build unless the repository explicitly requires another entry point
Package manager: NuGet through dotnet CLI / PackageReference
Dependency metadata: *.csproj plus optional Directory.Packages.props for central package versions
SDK selection: global.json for repositories that require reproducible SDK selection
Shared build settings: Directory.Build.props / Directory.Build.targets when multiple projects share policy
Formatter: dotnet format, driven by .editorconfig
Static analysis: built-in .NET analyzers + compiler warnings; repository-specific analyzers only when justified
Nullability: nullable reference types enabled for new non-trivial projects
Test command: dotnet test
Test framework: preserve the repository framework; xUnit is a reasonable default for new general-purpose test projects
Coverage: Microsoft code coverage or Coverlet only when the repository requires coverage reporting
IDE on Windows: Visual Studio 2026 or another C# IDE may be used, but CLI commands must remain reproducible
Automation shell on Windows: PowerShell 7 when repository scripts require a shell
```

## Version policy

```txt
For a new project, prefer the current supported LTS .NET release unless requirements force another target.
As of this contract's 2026 baseline, that means .NET 10 LTS and C# 14.
For an existing repository, preserve its TargetFramework(s), SDK, language version, test platform, and solution format unless the task explicitly includes an upgrade.
Do not silently retarget net8.0/net9.0/net10.0, .NET Framework, or Windows-specific TFMs.
Do not set LangVersion=latest merely to obtain newer syntax; normally let the target framework / SDK select the supported language version.
Use preview SDKs/language features only when the repository explicitly opts into previews.
```

## Hard rules

```txt
Use dotnet/MSBuild/NuGet for restore, build, test, packaging, and .NET tooling.
Do not introduce Node.js, Python, Java, or another runtime into a pure .NET workflow unless the repository already needs it or the task explicitly requires it.
Do not edit generated files under bin/ or obj/.
Do not commit bin/, obj/, TestResults/, user-specific IDE state, or local package caches.
Commit source project files, solution files, .editorconfig, global.json when used, and shared MSBuild configuration that affects the build.
Preserve existing .sln or .slnx format unless migration is part of the task.
Keep domain/application logic independent from ASP.NET Core, EF Core, WPF, WinForms, WinUI, filesystem, network, registry, and other infrastructure unless those APIs are the actual domain.
Use dependency injection at real boundaries; do not create interfaces for every class mechanically.
Every meaningful behavior change must have an executable verification path.
```

## Standard repository shape

For a non-trivial service or application, prefer a small number of cohesive projects rather than one project per folder:

```txt
project-name/
  global.json                     # when SDK selection is pinned
  ProjectName.slnx                # .sln is also valid; preserve existing repos
  Directory.Build.props           # shared compiler/analyzer/build policy when useful
  Directory.Packages.props        # central NuGet versions when useful
  .editorconfig
  README.md
  AI_SKILLS.md
  src/
    ProjectName.Domain/
      ProjectName.Domain.csproj
    ProjectName.Application/
      ProjectName.Application.csproj
    ProjectName.Infrastructure/
      ProjectName.Infrastructure.csproj
    ProjectName.Api/              # only for HTTP services
      ProjectName.Api.csproj
  tests/
    ProjectName.Domain.Tests/
    ProjectName.Application.Tests/
    ProjectName.IntegrationTests/
    ProjectName.EndToEndTests/    # only when justified
  docs/
    adr/
    architecture.md
    testing-strategy.md
  scripts/
```

Do not force four projects on a small tool. A compact project may be better:

```txt
project-name/
  ProjectName.slnx
  src/
    ProjectName/
      ProjectName.csproj
      Domain/
      Services/
      Adapters/
      Program.cs
  tests/
    ProjectName.Tests/
      ProjectName.Tests.csproj
```

ASP.NET Core service shape:

```txt
src/ProjectName.Api/
  Endpoints/ or Controllers/
  Contracts/
  Middleware/
  Configuration/
  Program.cs

src/ProjectName.Application/
  UseCases/
  Ports/ or Abstractions/

src/ProjectName.Infrastructure/
  Persistence/
  ExternalServices/
  Messaging/
```

Windows desktop shape (WPF / WinUI / WinForms):

```txt
src/ProjectName.Desktop/
  Views/
  ViewModels/
  Composition/
  Platform/

src/ProjectName.Application/
  UseCases/

src/ProjectName.Domain/
  Entities/
  ValueObjects/
  Policies/
```

Library shape:

```txt
src/ProjectName/
  ProjectName.csproj
  PublicApi/
  Internal/

tests/ProjectName.Tests/
```

## Bootstrap commands

Use placeholders when an exact SDK patch is environment-specific.

New solution and projects on .NET 10:

```powershell
dotnet --info
dotnet new globaljson --sdk-version <installed-10.0-sdk-version> --roll-forward latestFeature
dotnet new sln -n ProjectName

dotnet new classlib -n ProjectName.Domain -o src/ProjectName.Domain
dotnet new classlib -n ProjectName.Application -o src/ProjectName.Application
dotnet new classlib -n ProjectName.Infrastructure -o src/ProjectName.Infrastructure
dotnet new webapi -n ProjectName.Api -o src/ProjectName.Api

dotnet sln add src/ProjectName.Domain/ProjectName.Domain.csproj
dotnet sln add src/ProjectName.Application/ProjectName.Application.csproj
dotnet sln add src/ProjectName.Infrastructure/ProjectName.Infrastructure.csproj
dotnet sln add src/ProjectName.Api/ProjectName.Api.csproj
```

For a simple console app:

```powershell
dotnet new console -n ProjectName -o src/ProjectName
dotnet new xunit -n ProjectName.Tests -o tests/ProjectName.Tests
dotnet add tests/ProjectName.Tests/ProjectName.Tests.csproj reference src/ProjectName/ProjectName.csproj
dotnet restore
dotnet build
dotnet test
```

For ASP.NET Core:

```powershell
dotnet new webapi -n ProjectName.Api -o src/ProjectName.Api
dotnet run --project src/ProjectName.Api
```

For WPF on Windows:

```powershell
dotnet new wpf -n ProjectName.Desktop -o src/ProjectName.Desktop
```

For WinForms on Windows:

```powershell
dotnet new winforms -n ProjectName.Desktop -o src/ProjectName.Desktop
```

## Standard commands

Repository-level defaults:

```powershell
dotnet --info
dotnet restore
dotnet build -c Release --no-restore
dotnet test -c Release --no-build
dotnet format
dotnet format --verify-no-changes
```

Targeted checks are preferred while iterating:

```powershell
dotnet build src/ProjectName.Application/ProjectName.Application.csproj
dotnet test tests/ProjectName.Application.Tests/ProjectName.Application.Tests.csproj
dotnet test tests/ProjectName.IntegrationTests/ProjectName.IntegrationTests.csproj --filter <filter>
```

Packing a library when applicable:

```powershell
dotnet pack src/ProjectName/ProjectName.csproj -c Release --no-build
```

Publishing an application when applicable:

```powershell
dotnet publish src/ProjectName.Api/ProjectName.Api.csproj -c Release --no-build
```

## Shared compiler/build defaults

For multi-project repositories, centralize common policy in `Directory.Build.props` when that reduces duplication. Example baseline:

```xml
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <Deterministic>true</Deterministic>
  </PropertyGroup>
</Project>
```

Rules:

```txt
Do not centralize a property if projects legitimately need different values.
Do not put TargetFramework in Directory.Build.props when projects target different frameworks.
Do not suppress warnings repository-wide merely to get a green build; understand each suppression and scope it narrowly.
Use NoWarn sparingly and document non-obvious suppressions.
Treat warnings as errors in maintained production code unless legacy debt makes a staged migration necessary.
```

## NuGet central package management

For repositories with multiple projects, prefer `Directory.Packages.props` when it materially reduces version drift:

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Example.Package" Version="1.2.3" />
  </ItemGroup>
</Project>
```

Project reference:

```xml
<ItemGroup>
  <PackageReference Include="Example.Package" />
</ItemGroup>
```

Rules:

```txt
Do not add a package because it is convenient if the BCL/framework already solves the problem cleanly.
Keep package versions explicit and review dependency diffs.
Use central package management when several projects share package versions; do not add it to a tiny single-project repo without a reason.
For executable applications that require fully repeatable dependency resolution, consider packages.lock.json and locked restore in CI.
Do not require packages.lock.json for ordinary reusable class libraries merely by habit.
Review vulnerable/deprecated packages and transitive dependency impact before production release.
```

## C# coding standards

```txt
Enable nullable reference types in new non-trivial code.
Use nullability annotations as part of the public contract; do not silence warnings with ! unless the invariant is actually proven.
Prefer explicit domain types over dictionaries, tuples with unclear meaning, or primitive obsession at important boundaries.
Use records for immutable data/value semantics when records actually fit the model; do not use records mechanically for every class.
Prefer constructors/factories that make invalid domain states hard to create.
Use init/required members when they improve initialization safety, but do not replace domain invariants with object-initializer convenience.
Use decimal for money/financial arithmetic unless the domain explicitly requires another representation.
Use DateTimeOffset for real-world timestamps; use TimeProvider when behavior depends on the current time and must be testable.
Use TimeSpan for durations.
Use Guid only when its trade-offs fit identity requirements; do not choose identifier types by fashion.
Use Path APIs instead of manual path concatenation.
Dispose owned IDisposable/IAsyncDisposable resources with using/await using.
Avoid mutable static/global state.
Avoid service locator patterns and ambient dependency access.
Keep public APIs small and intentional; default implementation details to internal/private.
Use enums only for closed stable sets; use richer types when values carry behavior or invariants.
Prefer switch expressions/pattern matching when they make variant behavior exhaustive and readable.
Avoid reflection/dynamic unless runtime flexibility is genuinely required.
```

## Async and concurrency policy

```txt
Use async all the way across I/O paths.
Never block async work with .Result, .Wait(), GetAwaiter().GetResult(), Thread.Sleep(), or sync-over-async in normal application code.
Async methods performing cancellable I/O should normally accept CancellationToken and propagate it to dependencies.
Use async void only for framework-required event handlers.
Return Task by default; use ValueTask only when profiling or API semantics justify it.
Do not start fire-and-forget Tasks without explicit ownership, exception handling, cancellation, and lifetime semantics.
Use Task.WhenAll for independent concurrent work only when concurrency limits and failure behavior are understood.
Protect shared mutable state deliberately; do not assume async means thread-safe.
Prefer immutable messages/data across concurrent boundaries.
For CPU-bound parallelism, measure before adding Parallel.ForEachAsync, PLINQ, channels, or custom scheduling.
Do not blanket-add ConfigureAwait(false) to application code; follow repository/library conventions.
```

## Module boundary pattern

```txt
Domain:          Pure entities, value objects, policies, rules, domain services, domain errors.
Application:     Use cases/orchestration; depends on Domain and boundary abstractions.
Infrastructure:  EF Core, files, HTTP clients, queues, email, registry, Windows APIs, external providers.
API/UI:          Transport/presentation only; maps input/output and invokes application use cases.
Composition:     Dependency registration and concrete wiring at the executable boundary.
```

Rules:

```txt
Domain must not reference ASP.NET Core HttpContext, ControllerBase, EF Core DbContext, IConfiguration, ILogger, WPF controls, WinUI controls, Windows registry, or network clients unless that technology is genuinely part of the domain.
Application may depend on small abstractions representing external capabilities.
Infrastructure implements those abstractions and translates external models into internal models.
API/UI code should not contain the core business workflow.
Do not create repository/service/interface layers that merely forward calls without hiding complexity or providing a stable seam.
Keep mapping at boundaries so external DTO/schema changes do not ripple through the domain.
```

## ASP.NET Core policy

```txt
Endpoints/controllers should be thin: transport validation, authorization, mapping, use-case invocation, response mapping.
Do not pass HttpContext, HttpRequest, HttpResponse, ClaimsPrincipal, or IActionResult into domain logic.
Use typed request/response contracts at the HTTP boundary.
Use dependency injection through constructors or supported endpoint parameters; do not resolve arbitrary services from IServiceProvider inside business code.
Use ProblemDetails or an equivalent consistent error contract for HTTP failures.
Map domain/application failures to HTTP status codes only at the transport boundary.
Propagate CancellationToken from the request to I/O operations.
Use IHttpClientFactory for managed outbound HTTP clients unless a specific alternative is already established.
Validate configuration at startup when failure should prevent the service from starting.
Use authentication/authorization policies at the boundary; do not scatter role-string checks throughout business logic.
Keep OpenAPI behavior aligned with the real contract when the service exposes OpenAPI.
```

## Entity Framework Core policy

```txt
DbContext is infrastructure and should normally be scoped to a unit of work/request.
Keep EF Core queries in infrastructure/query modules, not spread throughout controllers and UI code.
Use AsNoTracking for read-only query paths when tracking is unnecessary.
Use async EF APIs for I/O and pass CancellationToken.
Do not hide EF Core behind a generic repository that only duplicates DbSet methods.
Introduce repositories only when they express a meaningful domain/persistence abstraction or encapsulate non-trivial persistence behavior.
Do not expose IQueryable across architectural boundaries unless query composition is intentionally part of the contract.
Version schema changes with migrations when EF migrations are the project's migration mechanism.
Do not call EnsureCreated as a substitute for production migrations.
Avoid lazy-loading behavior that creates hidden I/O unless the project explicitly chooses it and tests the consequences.
For integration tests, prefer the actual relational provider or a behaviorally relevant substitute; EF Core InMemory is not a relational database substitute for SQL semantics.
```

## Windows desktop policy

```txt
Use a Windows-specific TFM such as net10.0-windows only when Windows APIs or desktop frameworks require it; otherwise prefer a portable TFM.
Keep domain/application logic outside Window/Page/Form/UserControl classes.
Do not block the UI thread with I/O or long CPU work.
Marshal UI updates through the framework's dispatcher/synchronization mechanism when required.
Use MVVM or another presentation separation when UI state/workflows are non-trivial; do not add MVVM infrastructure to a tiny dialog without benefit.
Keep code-behind focused on view-specific behavior when using XAML frameworks.
Model loading, empty, error, disabled, and success states explicitly.
Dispose event subscriptions/resources when lifetime mismatches can cause leaks.
Treat registry, COM, filesystem locations, services, scheduled tasks, and Windows credentials as infrastructure boundaries.
Do not assume administrator privileges unless the product explicitly requires elevation.
```

## Serialization and boundary data policy

```txt
Treat JSON/XML/database/external API payloads as untrusted boundary data.
Do not deserialize directly into domain entities when external shape and domain invariants differ.
Use explicit DTOs/contracts and map them into validated internal types.
For System.Text.Json, make naming, enum, polymorphism, required-member, and unknown-member behavior explicit when compatibility matters.
Do not rely on incidental default serializer behavior for durable public contracts.
Version public contracts deliberately.
Preserve backward compatibility unless the task explicitly authorizes a breaking change.
```

## Configuration and secrets policy

```txt
Use strongly typed options/settings for non-trivial configuration.
Prefer injecting typed settings/capabilities over passing IConfiguration deep into the application/domain.
Validate required settings during startup.
Never commit passwords, API keys, certificates with private keys, connection-string secrets, access tokens, or user secrets.
Use .NET user-secrets for appropriate local development scenarios and environment/managed secret stores for deployed environments.
Do not log secret values or full sensitive payloads.
Keep environment-specific configuration outside compiled domain logic.
```

## Logging and observability policy

```txt
Use ILogger<T> or the repository's established abstraction at process/infrastructure boundaries.
Prefer structured logging properties over interpolated diagnostic strings when logs are queried operationally.
Log enough context to diagnose operations, but do not duplicate the same exception at every layer.
Log an exception where it is handled or at the process boundary; preserve stack traces with throw; when rethrowing unchanged.
Use source-generated logging for proven hot paths when performance matters.
Add metrics/tracing only when they support an operational question; do not instrument indiscriminately.
Never log credentials, tokens, private keys, or sensitive personal data.
```

## .NET testing defaults

```txt
Unit tests: domain rules, value objects, policies, parsers, calculations, state transitions, pure transformations.
Integration tests: EF Core/repositories, filesystem adapters, HTTP endpoints, serialization, external-client adapters, Windows integration boundaries when relevant.
Contract tests: adapter behavior, external API normalization, public library/API contracts.
Component/UI tests: important view-model or component behavior where practical.
E2E tests: only critical workflows; keep the suite small and stable.
Property-based tests: parsers, numeric rules, validators, state machines, or combinatorial domains when generated cases add value.
Regression tests: every non-trivial bug fix should gain a test that fails before the fix when feasible.
```

Recommended conventions:

```txt
Use the test framework already present in the repository.
Name tests by observable behavior, not by private implementation details.
Use deterministic fixtures/builders.
Inject TimeProvider or another clock seam for time-dependent behavior.
Inject randomness or use deterministic seeds when randomness affects behavior.
Do not mock the class/function under test.
Mock/fake external systems and unstable boundaries, not pure domain logic.
Prefer fakes over over-specified interaction mocks.
For ASP.NET Core integration tests, use the framework test host/WebApplicationFactory pattern when appropriate.
For database behavior, test against the relevant database semantics; do not assume an in-memory provider proves relational correctness.
Avoid Thread.Sleep in tests; wait on observable conditions or controllable clocks.
Tests must be order-independent unless the suite explicitly models a sequential scenario.
```

## .NET quality gate

During iteration, run the narrowest relevant checks. Before considering a meaningful change complete, run the broadest affordable gate for the affected solution:

```powershell
dotnet restore
dotnet format --verify-no-changes
dotnet build -c Release --no-restore
dotnet test -c Release --no-build
```

When packaging/publishing is part of the product:

```powershell
dotnet pack -c Release --no-build
dotnet publish <entry-project> -c Release --no-build
```

When lock files are intentionally used in CI:

```powershell
dotnet restore --locked-mode
```

Rules:

```txt
Do not claim a build/test passed unless the command actually completed successfully.
If the full solution cannot be checked, run the narrowest valid subset and state exactly what was not run.
Do not disable analyzers or tests to make the gate green.
Warnings introduced by the change must be resolved or explicitly justified.
Inspect git diff after automated formatting/code fixes to ensure unrelated files were not churned.
```

## Dependency policy

```txt
Inspect the current SDK, target framework, central package policy, feeds, and existing dependency conventions before adding packages.
Prefer BCL/ASP.NET Core built-ins before third-party libraries when functionality is adequate.
Add a dependency only when it removes more complexity/risk than it adds.
Prefer mature, maintained packages with compatible licenses and clear ownership.
Do not add overlapping libraries that solve the same concern without a migration plan.
Do not upgrade unrelated packages during a focused feature/bugfix unless required for compatibility/security.
Use explicit stable versions; avoid floating versions in production repositories unless the project intentionally accepts them.
After dependency changes, restore and inspect the resulting project/central package/lockfile diff.
Do not change NuGet sources or credentials without explicit need.
```

For .NET 10 CLI syntax, adding a package can use:

```powershell
dotnet package add <PackageName> --project <path-to-csproj>
```

Preserve the repository's established command form when supporting older SDKs.

## Error handling policy

```txt
Use exceptions for exceptional failures and programming/infrastructure failures where stack context matters.
Use explicit result/outcome types for expected business branching when callers are meant to handle the failure routinely.
Do not throw generic Exception for known domain failures when a clearer type/outcome exists.
Do not catch Exception in every layer; catch where you can add context, translate, compensate, or terminate safely.
When rethrowing the same exception, use throw; to preserve the stack trace.
Translate infrastructure/provider exceptions at the adapter/application boundary when callers should not depend on provider-specific exception types.
Never silently swallow exceptions.
For background services, define how failures affect retries, process lifetime, poison messages, and cancellation.
At HTTP/UI/process boundaries, convert failures into stable user/transport behavior without leaking sensitive internals.
```

## State modeling policy

Prefer explicit state that prevents impossible combinations.

Prefer:

```csharp
public abstract record LoadState<T>
{
    private LoadState() { }

    public sealed record Idle : LoadState<T>;
    public sealed record Loading : LoadState<T>;
    public sealed record Success(T Value) : LoadState<T>;
    public sealed record Failed(string Error) : LoadState<T>;
}
```

Over unrelated flags such as:

```csharp
public sealed class LoadState<T>
{
    public bool IsLoading { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
}
```

Reason: multiple booleans/nullables allow contradictory states unless every caller remembers the hidden invariant.

---

# 1. Operating Contract for the AI Developer

This file is meant to be pasted into an AI coding agent or stored in the repo as `AI_SKILLS.md` / `AGENTS.md` / `CLAUDE.md`.

The AI must behave as a technical implementer, not as a brainstorming assistant. Its default output must be code, tests, diagnosis, architecture notes, or precise implementation plans.

## Core behavior

1. Work from the repository state, not from assumptions.
2. Prefer small vertical slices over broad rewrites.
3. Preserve existing public behavior unless the task explicitly changes it.
4. Do not invent hidden requirements. When a requirement is missing, make a reasonable assumption and state it in the plan or commit notes.
5. Do not introduce new dependencies unless they solve a specific problem better than existing tools.
6. Every meaningful change must be testable.
7. When touching existing code, first understand call sites, data flow, and tests.
8. When a bug exists, reproduce it before fixing it when feasible.
9. When a behavior is important, encode it in tests or executable checks.
10. Leave the repo cleaner, but do not perform unrelated cleanup.

## Default work loop

```txt
1. Read the relevant files.
2. Identify the smallest useful slice.
3. State the intended change briefly.
4. Add or update tests first when practical.
5. Implement the change.
6. Run the narrowest useful checks.
7. Run the broader quality gate before finalizing.
8. Summarize changed files, checks run, and residual risks.
```

## Non-negotiables

```txt
Do not bypass tests to make a task appear complete.
Do not delete user work without explicit instruction.
Do not use destructive git commands unless explicitly authorized.
Do not mix formatting-only changes with behavioral changes unless unavoidable.
Do not hide uncertainty behind confident language.
Do not add abstractions without a real variation point or clear simplification.
Do not test private implementation details when public behavior can be tested.
```

---

# 2. Skill Router

Use this table to decide which discipline to apply.

| Situation | Skill | Output |
|---|---|---|
| New project, unclear module boundaries, major refactor | Codebase Design | Interfaces, seams, module responsibilities |
| Ambiguous terms, domain rules, business concepts | Domain Modeling | Glossary, invariants, examples, ADR candidates |
| Vague idea or many possible approaches | Decision Mapping | Decision map, risks, staged choices |
| Need to validate UI, algorithm, API, or data model quickly | Prototype | Throwaway prototype answering one question |
| Implementing a feature or bugfix | TDD + Implementation | Tests, code, refactor, quality gate |
| Failing behavior or regression | Diagnosing Bugs | Reproduction, hypothesis, fix, regression test |
| Reviewing branch, PR, generated code, or architecture | Two-Axis Review | Findings separated into Spec and Standards |
| Code feels hard to change or test | Improve Architecture | Deepening opportunities and refactor path |
| Converting a rough idea into product scope | To PRD | PRD with goals, non-goals, stories, risks |
| Converting a plan into work items | To Issues | Vertical issues with acceptance criteria |
| Setting up repo safety | Pre-Commit + Git Guardrails | Hooks, checks, protected workflow |
| Continuing work later or handing off to another agent | Handoff | Current state, decisions, next actions, risks |

---

# 3. Skill: Codebase Design

## Goal

Design deep modules: substantial behavior hidden behind small, stable interfaces.

## Vocabulary

```txt
Module: Function, class, package, endpoint, adapter, service, component, or vertical slice with an interface and implementation.
Interface: Everything a caller must know to use the module correctly: types, invariants, errors, order of calls, performance, side effects.
Implementation: Internal code behind the interface.
Seam: A boundary where behavior can be replaced without editing callers.
Adapter: A concrete implementation behind a seam.
Depth: High value behind a small interface.
Locality: The property that changes and bugs are concentrated in one area.
Pass-through module: A shallow wrapper that adds names but not leverage.
```

## Principles

1. Design interfaces around domain behavior, not around framework mechanics.
2. Prefer explicit inputs and return values over hidden global state.
3. Accept dependencies from the outside. Do not create hard-coded dependencies internally unless they are pure and stable.
4. Use adapters at real boundaries: database, filesystem, network, clock, external APIs, payment providers, queues, auth providers, browser APIs.
5. Avoid premature abstraction. One implementation is usually not enough evidence for an abstraction.
6. But do not duplicate domain rules across call sites. If the same rule appears twice, extract the rule behind a named interface.
7. Prefer deterministic pure functions for calculations, validation, parsing, formatting, and policy decisions.
8. Keep side effects at the edges.

## Interface checklist

```txt
[ ] Does this interface hide real complexity?
[ ] Can callers use it without knowing implementation details?
[ ] Are inputs and outputs typed or schema-validated?
[ ] Are expected errors modeled?
[ ] Are invariants explicit?
[ ] Can behavior be tested only through the public interface?
[ ] Does the module have one main reason to change?
[ ] Would removing this module duplicate complexity in multiple callers?
```

## Refactor trigger smells

```txt
- Many files need edits for one concept change.
- Same validation appears in controllers, UI, and tests.
- Tests require reflection, shims, or invasive mocking of internals instead of using public APIs.
- Framework objects leak into domain logic.
- External API payloads are used directly across the app.
- A service method mostly forwards arguments to another service.
- Boolean flags create multiple hidden modes in one function.
- Error handling is inconsistent across similar paths.
```

---

# 4. Skill: Domain Modeling

## Goal

Make the project language explicit so code, tests, docs, and prompts use the same concepts.

## Required artifacts when domain complexity exists

```txt
CONTEXT.md                  # glossary, entities, invariants, examples
docs/architecture.md         # system shape and module boundaries
docs/adr/0001-*.md           # durable decisions and trade-offs
docs/testing-strategy.md     # test layers and critical paths
```

## Rules

1. If a term is ambiguous, define the canonical term before implementing.
2. If two terms mean the same thing, choose one and remove the synonym from code.
3. If one term means two different things, split it.
4. Put durable decisions in ADRs, not only in chat history.
5. Encode domain invariants in constructors, schemas, validators, or test fixtures.
6. Prefer examples with edge cases over abstract definitions.

## Domain modeling template

```markdown
# Context

## Purpose

<What the system does and for whom.>

## Glossary

| Term | Meaning | Notes |
|---|---|---|
| User | ... | ... |
| Account | ... | ... |

## Core entities

### <Entity>

Fields:
- `id`: ...
- `status`: ...

Invariants:
- ...

Examples:
- Valid: ...
- Invalid: ...

## Workflows

### <Workflow>

1. ...
2. ...
3. ...

## Open questions

- ...
```

## ADR template

```markdown
# ADR <number>: <decision>

## Status

Proposed | Accepted | Superseded

## Context

<Problem, constraints, forces.>

## Decision

<Chosen option.>

## Consequences

Positive:
- ...

Negative:
- ...

## Alternatives considered

- Option A: rejected because ...
- Option B: rejected because ...
```

---

# 5. Skill: Decision Mapping

## Goal

Turn an unclear request into ordered decisions so implementation does not start with excessive uncertainty.

## When to use

```txt
- Requirements are broad or contradictory.
- Several architecture choices are possible.
- A dependency, framework, database, or API choice is not obvious.
- The task can be implemented in multiple incompatible ways.
- The user asks for a roadmap, implementation strategy, or migration plan.
```

## Decision map format

```markdown
# Decision Map — <topic>

## Objective

<What must become possible.>

## Hard constraints

- ...

## Decisions

### D1 — <decision>

Options:
- A: ...
- B: ...

Recommendation:
- Choose <A/B> because ...

Risks:
- ...

Validation:
- ...

## Sequence

1. Decide D1 before D3 because ...
2. Prototype D2 before committing because ...

## Reversible vs irreversible

Reversible:
- ...

Hard to reverse:
- ...
```

## Rule

Do not turn every detail into an up-front decision. Decide only what blocks safe implementation.

---

# 6. Skill: Prototype

## Goal

Build a temporary artifact to answer a specific uncertainty, then discard or rewrite it cleanly.

## Prototype contract

A prototype must define:

```txt
Question: What is being validated?
Scope: What is intentionally excluded?
Success: What observation decides the question?
Disposal: What must be deleted or rewritten if the prototype succeeds?
```

## Good prototype questions

```txt
Can this library render the required interaction?
Can this API return enough data with acceptable latency?
Can this parser represent the grammar cleanly?
Can this storage shape support the query pattern?
Can this algorithm produce deterministic output on edge cases?
```

## Rules

1. Do not ship prototype code unless it passes normal production standards.
2. Mark throwaway files clearly.
3. Keep prototype dependencies isolated.
4. Convert learnings into ADRs, tests, or implementation tasks.
5. Delete the prototype once the production slice exists.

---

# 7. Skill: TDD

## Goal

Use tests to define behavior and prevent regressions, not to mirror implementation.

## Red-Green-Refactor loop

```txt
1. Red: Add the smallest failing test for desired behavior.
2. Green: Implement the simplest code that satisfies the test.
3. Refactor: Improve structure while keeping tests green.
4. Repeat with the next behavior or edge case.
```

## Test pyramid

```txt
Many unit tests for pure rules and transformations.
Some integration tests for adapters, persistence, and framework boundaries.
Few end-to-end tests for critical user workflows.
Contract tests for external APIs or module interfaces.
Property-based tests for parsers, validators, calculations, and state machines.
Regression tests for every non-trivial bug fix.
```

## Good tests

```txt
[ ] Assert public behavior, not private implementation.
[ ] Have one clear reason to fail.
[ ] Use meaningful fixtures.
[ ] Cover edge cases and invalid input.
[ ] Avoid sleeps, randomness, and network dependency unless explicitly isolated.
[ ] Fail with useful messages.
[ ] Are deterministic in any order.
```

## Bad tests

```txt
- Tests that only assert a mock was called while no behavior is verified.
- Tests that duplicate the implementation line by line.
- Snapshot tests for unstable or irrelevant output.
- Tests that require a specific internal file structure.
- Tests that pass even when the feature is broken.
```

## Mocking rules

```txt
Mock external systems, time, randomness, network, filesystem boundaries, payment providers, email/SMS providers, queues, and browser APIs.
Do not mock the domain logic being tested.
Prefer fake implementations over over-specified mocks.
Use contract tests to ensure fakes match real adapters.
```

---

# 8. Skill: Implementation Workflow

## Before coding

```txt
[ ] Read the task and identify acceptance criteria.
[ ] Inspect existing files and tests.
[ ] Identify the module boundary.
[ ] Decide whether this is feature, bugfix, refactor, test-only, or docs.
[ ] Choose the narrowest useful quality gate.
```

## During coding

```txt
[ ] Keep changes scoped.
[ ] Add types/schemas before business logic when useful.
[ ] Keep side effects at boundaries.
[ ] Update tests alongside code.
[ ] Prefer small commits or logical change groups.
[ ] Do not mix unrelated refactors.
```

## Before final answer or commit

```txt
[ ] Run formatter.
[ ] Run lint/static checks.
[ ] Run relevant tests.
[ ] Run full test suite when the change touches shared or critical code.
[ ] Check git diff.
[ ] Summarize behavior changes and files touched.
[ ] State any checks not run and why.
```

---

# 9. Skill: Diagnosing Bugs

## Goal

Fix bugs by narrowing uncertainty, not by guessing.

## Debug loop

```txt
1. Describe the observed failure.
2. Identify expected behavior.
3. Create or find a reproduction.
4. Reduce the reproduction to the smallest failing case.
5. Form one hypothesis at a time.
6. Test the hypothesis with logs, debugger, assertions, or targeted tests.
7. Fix the root cause.
8. Add a regression test.
9. Remove temporary instrumentation.
```

## Bug report template

```markdown
# Bug Diagnosis — <title>

## Observed behavior

...

## Expected behavior

...

## Reproduction

...

## Scope

Affected:
- ...

Not affected:
- ...

## Root cause

...

## Fix

...

## Regression test

...
```

## Rules

```txt
Do not patch symptoms before locating the root cause.
Do not keep debug logs unless they are useful operational logs.
Do not change multiple suspected causes at once.
Do not mark fixed without a reproduction or a targeted verification.
```

---

# 10. Skill: Two-Axis Review

## Goal

Review changes along two independent axes:

```txt
Spec axis: Does the change implement the requested behavior?
Standards axis: Is the change maintainable, safe, tested, and aligned with project conventions?
```

## Review output format

```markdown
# Review

## Blocking findings

1. <Finding>
   - Axis: Spec | Standards
   - Evidence: <file/function/test>
   - Why it matters: ...
   - Required change: ...

## Non-blocking findings

1. ...

## Tests and verification gaps

- ...

## Suggested follow-ups

- ...
```

## Review checklist

```txt
[ ] Requirement coverage is complete.
[ ] No obvious edge case is ignored.
[ ] Types/schemas validate external input.
[ ] Errors are explicit and actionable.
[ ] Tests would fail if behavior regressed.
[ ] No unnecessary dependency was added.
[ ] No secret, token, or generated artifact was committed.
[ ] No large unrelated formatting diff is mixed in.
[ ] Naming matches domain language.
[ ] Public interfaces remain stable or migration is handled.
```

---

# 11. Skill: Improve Codebase Architecture

## Goal

Improve architecture by increasing locality, reducing interface burden, and making behavior easier to test.

## Process

```txt
1. Identify pain: hard to test, hard to change, duplicated rule, leaky abstraction.
2. Trace the behavior across files.
3. Find the current interface and hidden assumptions.
4. Propose the smallest refactor that improves locality.
5. Add characterization tests before moving behavior.
6. Refactor behind existing public behavior.
7. Remove dead code and obsolete tests.
```

## Deepening opportunities

```txt
- Move repeated validation into a value object or schema.
- Replace scattered conditionals with a policy object or rules function.
- Wrap external API payloads in normalized internal models.
- Convert framework-bound business logic into pure services.
- Split command/query paths when one method does too much.
- Replace global config reads with explicit injected settings.
- Introduce a repository only when persistence behavior is non-trivial.
```

## Refactor safety rules

```txt
Do not refactor and change product behavior in the same step unless necessary.
Preserve public contracts or document migration.
Prefer characterization tests before touching tangled legacy code.
Measure performance-sensitive refactors before claiming improvement.
```

---

# 12. Skill: To PRD

## Goal

Convert a rough idea into a scoped product requirement document.

## PRD template

```markdown
# PRD — <feature/product>

## Problem

<Concrete problem and user.>

## Goals

- ...

## Non-goals

- ...

## Users and use cases

- ...

## Functional requirements

1. ...

## Non-functional requirements

- Performance: ...
- Security: ...
- Accessibility: ...
- Reliability: ...
- Observability: ...

## UX/API behavior

- ...

## Data model impact

- ...

## Edge cases

- ...

## Acceptance criteria

- ...

## Test strategy

- Unit: ...
- Integration: ...
- E2E: ...

## Open questions

- ...
```

## Rules

```txt
Keep PRDs implementation-aware but not implementation-locked unless a technical constraint is already decided.
Explicitly list non-goals to prevent scope creep.
Acceptance criteria must be externally observable.
```

---

# 13. Skill: To Issues

## Goal

Break work into implementable vertical issues.

## Issue template

```markdown
# <Issue title>

## Objective

<One outcome.>

## Context

<Relevant decision, link, or constraint.>

## Scope

In:
- ...

Out:
- ...

## Implementation notes

- ...

## Acceptance criteria

- [ ] ...
- [ ] ...

## Tests required

- [ ] Unit: ...
- [ ] Integration: ...
- [ ] E2E: ...

## Dependencies

- ...
```

## Rules

```txt
Each issue should deliver user-visible behavior, domain capability, or infrastructure required by the next vertical slice.
Avoid issues that only say "build backend" or "create UI".
Keep issue dependencies explicit.
```

---

# 14. Skill: Pre-Commit and Quality Gates

## Goal

Make correct behavior cheaper than incorrect behavior.

## Minimum hooks

```txt
dotnet format --verify-no-changes for the relevant scope
dotnet build for the relevant project/solution
dotnet test for the fast/unit suite
secret scan if the project handles credentials
block large generated/transient artifacts unless explicitly allowed
```

## Rules

```txt
Hooks should be fast enough to run locally.
CI can run slower checks.
Do not rely only on pre-commit; document commands in README.
Do not let generated files churn unless they are required artifacts.
```

---

# 15. Skill: Git Guardrails

## Goal

Prevent accidental loss of work while allowing normal development.

## Rules for AI agents

```txt
Allowed without explicit permission:
- git status
- git diff
- git log
- git show
- git branch --show-current

Ask before:
- git add
- git commit
- git push
- git pull --rebase
- creating or deleting branches

Never run unless explicitly authorized for the exact command:
- git reset --hard
- git clean -fd
- git checkout -- .
- git restore .
- git rebase
- git push --force
- rm -rf on project directories
```

## Before editing

```txt
Run git status.
Notice uncommitted user changes.
Do not overwrite files the user changed unless the task requires it and the diff is understood.
```

---

# 16. Skill: Handoff

## Goal

Let another agent or future session continue without rediscovering context.

## Handoff template

````markdown
# Handoff — <project/task>

## Current objective

...

## Completed

- ...

## Current state

- Branch: ...
- Relevant files: ...
- Tests passing/failing: ...

## Decisions made

- ...

## Important constraints

- ...

## Next steps

1. ...
2. ...
3. ...

## Risks / unknowns

- ...

## Commands last run

```txt
...
```
````

---

# 17. Prompt to Start a New AI Coding Session

Use this when starting work with an AI coding agent:

```txt
You are working in this repository as an implementation agent.

First read this file and obey it as the project operating contract.

Task:
<describe the task>

Constraints:
- Preserve existing behavior unless explicitly changing it.
- Work in the smallest safe vertical slice.
- Add or update tests for meaningful behavior.
- Use the project's documented package manager, runtime, formatter, linter, and test commands.
- Before editing, inspect relevant files and current git status.
- After editing, run the narrowest useful checks and report exactly what passed or failed.

Return:
- Summary of changes.
- Files changed.
- Commands run.
- Remaining risks or follow-up work.
```

---

# 18. C# / .NET / Windows-Specific Final Checklist

```txt
[ ] The repository's target framework(s) and supported Windows/runtime constraints are understood before editing.
[ ] global.json exists when SDK reproducibility is a project requirement and its roll-forward policy is intentional.
[ ] Existing .sln/.slnx format is preserved unless migration was explicitly requested.
[ ] *.csproj, Directory.Build.props, Directory.Packages.props, NuGet.Config, and .editorconfig changes are intentional and scoped.
[ ] Nullable reference types are enabled for new non-trivial code or legacy nullability policy is preserved deliberately.
[ ] New compiler/analyzer warnings were not hidden just to make the build pass.
[ ] No bin/, obj/, TestResults/, IDE-user state, local secrets, package cache, or generated transient artifacts were committed.
[ ] Domain/application logic is not coupled to ASP.NET Core, EF Core, WPF, WinForms, WinUI, registry, filesystem, network, or provider-specific objects unless that dependency is part of the domain.
[ ] Async I/O stays async; no accidental .Result/.Wait()/Thread.Sleep sync-over-async was introduced.
[ ] CancellationToken is propagated through cancellable I/O paths where appropriate.
[ ] Date/time, money, paths, disposal, and nullability use appropriate .NET types and semantics.
[ ] External payloads are mapped/validated at boundaries rather than leaked through the codebase.
[ ] EF Core changes include correct query/tracking behavior and migrations when schema changes require them.
[ ] ASP.NET Core endpoint/controller changes keep transport concerns at the boundary and return consistent errors.
[ ] Windows desktop code does not block the UI thread and keeps business logic outside view classes.
[ ] Tests cover public/observable behavior and include regression coverage for non-trivial bug fixes.
[ ] dotnet format --verify-no-changes passes for the relevant scope.
[ ] dotnet build -c Release passes for the relevant solution/projects.
[ ] dotnet test passes for the relevant test projects/suite.
[ ] dotnet pack/publish passes when the changed deliverable is packaged or published.
[ ] Dependency and package-version diffs were reviewed; no unrelated package upgrades were mixed in.
[ ] Secrets, tokens, private certificates, sensitive connection strings, and confidential payloads are absent from source/logging.
[ ] git diff was inspected after automated edits.
[ ] Any checks not run are reported explicitly with the reason.
```

# 19. Minimal C# / .NET Agent Prompt

```txt
You are implementing a C#/.NET project on Windows.

Use the repository's existing .NET SDK, target framework, solution format, NuGet conventions, test framework, and build configuration.
For a new project with no contrary constraint, use the current .NET LTS baseline (this contract targets .NET 10 LTS / C# 14), pin SDK expectations with global.json when reproducibility matters, and use dotnet CLI/MSBuild/NuGet as the authoritative automation path.
Do not introduce Node.js, Python, or another runtime into a pure .NET workflow unless the repository already requires it or the task explicitly does.

Follow AI_SKILLS.md.
Work from the actual repository state, not assumptions.
Work in the smallest safe vertical slice.
Preserve public behavior unless the task explicitly changes it.
Keep domain/application code independent from framework/infrastructure details.
Use nullable-aware, cancellation-aware, async-safe C#.
Add/update tests for meaningful behavior and regression fixes.
Run the narrowest useful checks while iterating, then run the relevant .NET quality gate before finalizing.
Report changed files, commands run, exact pass/fail results, assumptions, and remaining risks.
```
