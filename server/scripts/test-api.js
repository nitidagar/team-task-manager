/**
 * End-to-end API smoke test. Run: node scripts/test-api.js
 * Requires: server running, PostgreSQL migrated, DATABASE_URL + JWT_SECRET in .env
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE = "http://localhost:5000/api";

async function request(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  const ts = Date.now();
  const email = `test${ts}@example.com`;
  const email2 = `member${ts}@example.com`;

  console.log("1. Signup admin...");
  let r = await request("POST", "/auth/signup", {
    name: "Test Admin",
    email,
    password: "password123",
  });
  if (r.status !== 201) throw new Error(`Signup failed: ${JSON.stringify(r.data)}`);
  const adminToken = r.data.token;
  const adminId = r.data.user.id;

  console.log("2. Signup member...");
  r = await request("POST", "/auth/signup", {
    name: "Test Member",
    email: email2,
    password: "password123",
  });
  if (r.status !== 201) throw new Error(`Member signup failed`);
  const memberId = r.data.user.id;

  console.log("3. Create project...");
  r = await request(
    "POST",
    "/projects",
    { name: "Test Project", description: "E2E test" },
    adminToken
  );
  if (r.status !== 201) throw new Error(`Create project failed: ${JSON.stringify(r.data)}`);
  const projectId = r.data.id;

  console.log("4. Add member...");
  r = await request(
    "POST",
    `/projects/${projectId}/members`,
    { email: email2, role: "MEMBER" },
    adminToken
  );
  if (r.status !== 201) throw new Error(`Add member failed: ${JSON.stringify(r.data)}`);

  console.log("5. Create task with all fields...");
  r = await request(
    "POST",
    `/projects/${projectId}/tasks`,
    {
      title: "Test Task",
      description: "Task description",
      dueDate: "2026-12-31",
      priority: "HIGH",
      assigneeId: memberId,
    },
    adminToken
  );
  if (r.status !== 201) throw new Error(`Create task failed: ${JSON.stringify(r.data)}`);
  const taskId = r.data.id;
  if (r.data.priority !== "HIGH" || r.data.assignee?.id !== memberId) {
    throw new Error("Task fields not saved correctly");
  }

  console.log("6. PATCH task status (kanban move)...");
  r = await request(
    "PATCH",
    `/tasks/${taskId}`,
    { status: "IN_PROGRESS" },
    adminToken
  );
  if (r.status !== 200 || r.data.status !== "IN_PROGRESS") {
    throw new Error(`PATCH status failed: ${JSON.stringify(r.data)}`);
  }

  console.log("7. Dashboard stats...");
  r = await request("GET", "/dashboard", null, adminToken);
  if (r.status !== 200) throw new Error("Dashboard failed");
  if (r.data.byStatus.IN_PROGRESS < 1) {
    throw new Error("Dashboard byStatus not updated");
  }

  console.log("8. Member login & PATCH own task...");
  r = await request("POST", "/auth/login", { email: email2, password: "password123" });
  const memberToken = r.data.token;
  r = await request("PATCH", `/tasks/${taskId}`, { status: "DONE" }, memberToken);
  if (r.status !== 200 || r.data.status !== "DONE") {
    throw new Error(`Member PATCH failed: ${JSON.stringify(r.data)}`);
  }

  console.log("9. Member sees only assigned tasks...");
  r = await request("GET", `/projects/${projectId}`, null, memberToken);
  if (r.status !== 200 || r.data.tasks.length !== 1) {
    throw new Error(`Member task filter failed: ${r.data.tasks?.length} tasks`);
  }

  console.log("\n✅ All API tests passed!");
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
