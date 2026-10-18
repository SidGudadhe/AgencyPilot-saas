import {
  findLocalUserById,
  updateLocalUserProfile,
  updateLocalUserPassword,
  saveLocalUser,
} from "../src/lib/local-store";

describe("User Profile & Password Update Verification", () => {
  const testEmail = `profile_test_${Date.now()}@agencypilot.io`;
  let createdUser: any;

  beforeAll(() => {
    createdUser = saveLocalUser({
      name: "Original Test Name",
      email: testEmail,
      passwordHash: "dummy-hash-123",
      workspaceName: "Test Workspace",
    });
  });

  test("findLocalUserById finds the created user", () => {
    const user = findLocalUserById(createdUser.id);
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Original Test Name");
    expect(user?.email).toBe(testEmail);
  });

  test("updateLocalUserProfile successfully updates the user's name", () => {
    const updated = updateLocalUserProfile(createdUser.id, "Updated New Name");
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Updated New Name");

    // Verify persistence
    const reloaded = findLocalUserById(createdUser.id);
    expect(reloaded?.name).toBe("Updated New Name");
  });

  test("updateLocalUserProfile works with user email as well", () => {
    const updated = updateLocalUserProfile(testEmail, "Second Update By Email");
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Second Update By Email");

    const reloaded = findLocalUserById(createdUser.id);
    expect(reloaded?.name).toBe("Second Update By Email");
  });

  test("updateLocalUserPassword updates password hash", () => {
    const newHash = "new-secure-bcrypt-hash";
    const success = updateLocalUserPassword(createdUser.id, newHash);
    expect(success).toBe(true);

    const reloaded = findLocalUserById(createdUser.id);
    expect(reloaded?.passwordHash).toBe(newHash);
  });

  test("returns null/false when attempting to update non-existent user", () => {
    const nullUser = updateLocalUserProfile("non_existent_id_99999", "Ghost");
    expect(nullUser).toBeNull();

    const falsePass = updateLocalUserPassword("non_existent_id_99999", "ghost-hash");
    expect(falsePass).toBe(false);
  });
});
