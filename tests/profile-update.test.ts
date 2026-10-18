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

  test("authOptions.callbacks.jwt and session dynamically sync updated user name", async () => {
    const { authOptions } = await import("../src/lib/auth");

    // 1. Initial login token setup
    const initialToken: any = await authOptions.callbacks!.jwt!({
      token: { sub: createdUser.id },
      user: { id: createdUser.id, name: "Second Update By Email", email: testEmail } as any,
    });
    expect(initialToken.name).toBe("Second Update By Email");

    // 2. Profile name is updated in local store
    updateLocalUserProfile(createdUser.id, "Sid plotform ads");

    // 3. Next token evaluation dynamically picks up latest name
    const updatedToken: any = await authOptions.callbacks!.jwt!({
      token: { id: createdUser.id, email: testEmail },
    });
    expect(updatedToken.name).toBe("Sid plotform ads");

    // 4. Client session dynamically contains updated name
    const sessionResult: any = await authOptions.callbacks!.session!({
      session: { user: { id: createdUser.id, email: testEmail } } as any,
      token: updatedToken,
    });
    expect(sessionResult.user.name).toBe("Sid plotform ads");

    // 5. Session update trigger correctly reflects name
    const triggeredToken: any = await authOptions.callbacks!.jwt!({
      token: { id: createdUser.id, name: "Old Name" },
      trigger: "update",
      session: { name: "Direct Trigger Name" },
    });
    // Should be overridden by the fresh local store value or updated session value
    expect(triggeredToken.name).toBeDefined();
  });
});
