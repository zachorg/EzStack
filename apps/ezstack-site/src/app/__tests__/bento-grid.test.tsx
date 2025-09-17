// Smoke test to ensure bento grid renders tiles defined in config.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BentoGrid } from "../components/bento-grid";

describe("BentoGrid", () => {
  it("renders all product tiles from config", () => {
    render(<BentoGrid />);
    expect(screen.getByText(/EzAuth/)).toBeInTheDocument();
    expect(screen.getByText(/EzPayments/)).toBeInTheDocument();
    expect(screen.getByText(/EzAnalytics/)).toBeInTheDocument();
  });
});


