import { expect, test } from "@playwright/test";

test.describe("example page", () => {
  test("renders the React SDK playground and local interactions work", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Pipewave React — Hook Examples" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Connection Status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "All-in-One (send + receive)" }),
    ).toBeVisible();

    await expect(
      page.locator("p").filter({ hasText: /^status:/ }).first(),
    ).toBeVisible();
    await expect(page.getByText(/^Sent: 0 message\(s\)$/)).toBeVisible();

    await page.getByRole("button", { name: "Send Fire-and-Forget" }).click();
    await expect(page.getByText("Sent: 1 message(s)")).toBeVisible();

    await page.getByRole("button", { name: "Send Ping" }).click();
    await expect(page.getByText(/→ PING:/)).toBeVisible();

    await expect(page.getByText("🐛 PW")).toBeVisible();
  });
});
