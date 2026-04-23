import React from "react";
import { render, screen } from "@testing-library/react";
import Canvas from "./Canvas";

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    scale: jest.fn(),
    translate: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillStyle: "",
    createImageData: jest.fn(),
    putImageData: jest.fn(),
    canvas: { width: 320, height: 240 },
  });
});

describe("Canvas", () => {
  it("renders a canvas element", () => {
    const frame = jest.fn();
    render(<Canvas frame={frame} data-testid="test-canvas" />);

    expect(screen.getByTestId("test-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("test-canvas").tagName).toBe("CANVAS");
  });

  it("passes extra props to canvas element", () => {
    const frame = jest.fn();
    render(<Canvas frame={frame} width={320} height={240} data-testid="test-canvas" />);

    const canvas = screen.getByTestId("test-canvas");
    expect(canvas).toHaveAttribute("width", "320");
    expect(canvas).toHaveAttribute("height", "240");
  });

  it("calls init when provided", () => {
    const frame = jest.fn();
    const init = jest.fn();
    render(<Canvas frame={frame} init={init} data-testid="test-canvas" />);

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("does not crash without init", () => {
    const frame = jest.fn();
    expect(() => {
      render(<Canvas frame={frame} data-testid="test-canvas" />);
    }).not.toThrow();
  });
});
