import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Select from "@/components/ui/Select";

// The motion tokens read prefers-reduced-motion.
window.matchMedia ??= ((query: string) =>
  ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }) as unknown as MediaQueryList);

const options = ["Partner", "Parent", "Child", "Brother", "Sister", "Friend"].map((label) => ({ value: label, label }));

function Harness({ onChange = () => {}, onOuterEscape }: { onChange?: (value: string) => void; onOuterEscape?: () => void }) {
  const [value, setValue] = useState("Partner");
  return (
    <div ref={(node) => node?.addEventListener("keydown", (event) => event.key === "Escape" && onOuterEscape?.())}>
      <Select
        label="They are your"
        value={value}
        options={options}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const field = () => screen.getByRole("combobox", { name: "They are your" });
const key = (name: string) => fireEvent.keyDown(field(), { key: name });

describe("Select (the design system's select)", () => {
  it("is a labelled combobox showing the choice, with no native select", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector("select")).toBeNull();
    expect(field()).toHaveTextContent("Partner");
    expect(field()).toHaveAttribute("aria-haspopup", "listbox");
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens with the keyboard, moves with the arrows and chooses with Enter", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    key("ArrowDown");
    expect(field()).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("listbox", { name: "They are your" });
    expect(list).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Partner" })).toHaveAttribute("aria-selected", "true");
    expect(field().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Partner" }).id);

    key("ArrowDown");
    key("ArrowDown");
    expect(field().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Child" }).id);
    key("End");
    expect(field().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Friend" }).id);
    key("Home");
    key("ArrowDown");
    key("Enter");
    expect(onChange).toHaveBeenCalledWith("Parent");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).toHaveTextContent("Parent");
    expect(field()).toHaveFocus();
  });

  it("jumps to an option by typing", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    key("Enter");
    key("s");
    key("Enter");
    expect(onChange).toHaveBeenCalledWith("Sister");
  });

  it("Escape closes the list without choosing, and doesn't reach the overlay around it", () => {
    const onChange = vi.fn();
    const onOuterEscape = vi.fn();
    render(<Harness onChange={onChange} onOuterEscape={onOuterEscape} />);
    key(" ");
    key("ArrowDown");
    key("Escape");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
    expect(onOuterEscape).not.toHaveBeenCalled();
  });

  it("chooses with a click", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(field());
    fireEvent.click(screen.getByRole("option", { name: "Friend" }));
    expect(onChange).toHaveBeenCalledWith("Friend");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    // The list fades out, then leaves.
    return waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });
});
