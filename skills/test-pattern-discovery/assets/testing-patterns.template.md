# Testing Patterns

<!-- context-meta
verification-commit: [hash or unknown]
generated-at: [ISO-TIMESTAMP]
confidence: [high | medium | low]
-->

---

## Test Layers Detected

<!-- Quick overview of which test layers exist in this repo -->

| Layer                | Detected | Root Path(s)                              | Framework / Tool              |
|----------------------|----------|-------------------------------------------|-------------------------------|
| Unit                 | ✅ / ❌  |                                           |                               |
| Integration          | ✅ / ❌  |                                           |                               |
| Functional           | ✅ / ❌  |                                           |                               |
| Acceptance / BDD     | ✅ / ❌  |                                           |                               |
| Performance / Load   | ✅ / ❌  |                                           |                               |
| Shell Script Tests   | ✅ / ❌  |                                           |                               |

---

## Unit & Integration Tests

### Test Frameworks
- **Runner**: [e.g., JUnit 5, Jest, pytest, TestNG, Mocha, Vitest]
- **Mocking**: [e.g., Mockito, MockK, jest.mock, unittest.mock, sinon]
- **Assertions**: [e.g., AssertJ, JUnit 5 Assertions, Hamcrest, expect (Jest), pytest assert]

### Naming Conventions
- **Class / File**: [e.g., *Test.java, *.test.ts, test_*.py]
- **Methods**: [e.g., should_do_thing_when_condition, testDoThing, it('should...')]

### Mocking / Stubbing Style
Describe how mocks are initialized and used.
- [e.g., Uses @ExtendWith(MockitoExtension.class) and @Mock annotations]
- [e.g., Uses manual mock() instantiation in @BeforeEach]
- [e.g., jest.mock('../module') at top of file]

### Assertion Style
- [e.g., Prefer assertThat(actual).isEqualTo(expected)]
- [e.g., Uses BDD style given/when/then comments]
- [e.g., expect(actual).toBe(expected) — Jest]

### Test Data / Fixture Patterns
- [e.g., Uses static factory methods in TestData class]
- [e.g., Uses @Builder on DTOs for concise test data setup]
- [e.g., pytest fixtures in conftest.py]

### Framework-Specific Integration Patterns
- **Database**: [e.g., Uses @DataJpaTest, H2 in-memory, or TestContainers]
- **Slices**: [e.g., Uses @WebMvcTest for controller layer tests]
- **Harness**: [e.g., Inherits from BaseIntegrationTest.java]
- **External Services**: [e.g., WireMock for HTTP mocking, LocalStack for AWS]

---

## Acceptance / BDD Tests

<!-- If not detected: "Not detected — checked: features/, test/acceptance/, **/*.feature" -->

- **Framework**: [e.g., Cucumber (Java), Karate, Behave (Python), pytest-bdd]
- **Feature file location**: [e.g., src/test/resources/features/, features/]
- **Step definitions location**: [e.g., src/test/java/steps/, tests/steps/]
- **Runner / entry point**: [e.g., CucumberRunner.java, behave features/]
- **Tags / profiles used**: [e.g., @smoke, @regression, @wip]
- **Test data strategy**: [e.g., embedded in .feature files, external JSON fixtures]

---

## Functional Tests

<!-- If not detected: "Not detected — checked: test/functional/, tests/functional/, src/functionalTest/" -->

- **Framework / approach**: [e.g., REST-assured, Supertest, httpx + pytest, custom bash scripts]
- **Test root**: [e.g., src/functionalTest/java/, tests/functional/]
- **Scope**: [e.g., black-box HTTP testing against a running service, database state validation]
- **Environment / setup**: [e.g., requires docker-compose up, uses test profile]

---

## Performance / Load Tests

<!-- If not detected: "Not detected — checked: perf/, performance/, load-test/, gatling/, k6/, jmeter/" -->

- **Tool**: [e.g., Gatling, k6, JMeter (.jmx), Locust, Artillery]
- **Test root**: [e.g., src/gatling/scala/, k6/scripts/, perf/]
- **Scenario structure**: [e.g., Gatling simulations extend Simulation, k6 export default function]
- **Thresholds / assertions**: [e.g., p99 < 500ms, error rate < 1%]
- **Execution command**: [e.g., ./gradlew gatlingRun, k6 run perf/load.js]

---

## Shell Script Tests

<!-- If not detected: "Not detected — checked: test*/**/*.sh, acceptance*/**/*.sh, **/*.bats, scripts/test*/" -->

- **Framework**: [e.g., BATS (Bash Automated Testing System), custom shell conventions, none]
- **File locations**: [e.g., test/acceptance/run_acceptance.sh, scripts/smoke_test.sh]
- **Naming convention**: [e.g., test_*.sh, *_test.sh, run_*.sh, smoke_*.sh]
- **Assertion style**: [e.g., BATS assert / assert_equal macros, exit-code checks (`[ $? -eq 0 ]`), diff comparisons]
- **Setup / teardown**: [e.g., BATS setup()/teardown() hooks, custom init scripts sourced at top]
- **What they test**: [e.g., smoke tests against deployed environment, acceptance criteria via CLI, data pipeline output validation, performance timing with time command]
- **Environment / prerequisites**: [e.g., requires running service, specific env vars set, Docker running]

### Shell Script Canonical Examples
- `[path/to/smoke_test.sh]` — [what it tests]
- `[path/to/acceptance_test.sh]` — [what it tests]

---

## Execution Patterns

Describe how to run each test type. Verify commands against build files and CI/CD workflow `run:` steps.

| Test Type            | Command(s)                                              | Notes / Prerequisites                   |
|----------------------|---------------------------------------------------------|-----------------------------------------|
| Unit Tests           | [e.g., ./gradlew test, npm test, pytest tests/unit]     |                                         |
| Integration Tests    | [e.g., ./gradlew integrationTest, npm run test:int]     | [e.g., Requires Docker]                 |
| Functional Tests     | [e.g., ./gradlew functionalTest, npm run test:func]     | [e.g., Service must be running]         |
| Acceptance / BDD     | [e.g., ./gradlew acceptanceTest, behave features/]      | [e.g., Requires test environment]       |
| Performance / Load   | [e.g., ./gradlew gatlingRun, k6 run perf/load.js]       | [e.g., Requires live endpoint]          |
| Shell Script Tests   | [e.g., bash test/acceptance/run.sh, bats test/*.bats]   | [e.g., Requires env vars, Docker]       |
| Full Suite           | [e.g., ./gradlew build, npm run test:all]               |                                         |

---

## Canonical Example Files

List 2–6 files that perfectly exemplify the patterns above. Cover at least one per detected layer.

| Layer                | File Path                                               | Why it's canonical                      |
|----------------------|---------------------------------------------------------|-----------------------------------------|
| Unit                 | `[path/to/SomeServiceTest.java]`                        |                                         |
| Integration          | `[path/to/SomeIntegrationTest.java]`                    |                                         |
| Acceptance / BDD     | `[path/to/some.feature]` or `[path/to/steps/]`          |                                         |
| Functional           | `[path/to/functional_test.py]`                          |                                         |
| Performance          | `[path/to/load_test.js]`                                |                                         |
| Shell Script         | `[path/to/smoke_test.sh]`                               |                                         |
