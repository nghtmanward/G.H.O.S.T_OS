import { MathEngine } from "./math_engine";
import { vec3, mat4, quat } from "gl-matrix";

describe("MathEngine", () => {
  // ---------------------------------------------------------
  // Vector operations
  // ---------------------------------------------------------
  test("add() adds two vec3", () => {
    const out = MathEngine.add([1, 2, 3], [4, 5, 6]);
    expect(Array.from(out)).toEqual([5, 7, 9]);
  });

  test("sub() subtracts two vec3", () => {
    const out = MathEngine.sub([5, 7, 9], [1, 2, 3]);
    expect(Array.from(out)).toEqual([4, 5, 6]);
  });

  test("dot() computes dot product", () => {
    const out = MathEngine.dot([1, 2, 3], [4, 5, 6]);
    expect(out).toBe(32);
  });

  test("cross() computes cross product", () => {
    const out = MathEngine.cross([1, 0, 0], [0, 1, 0]);
    expect(Array.from(out)).toEqual([0, 0, 1]);
  });

  test("normalize() normalizes a vector", () => {
    const out = MathEngine.normalize([10, 0, 0]);
    expect(Array.from(out)).toEqual([1, 0, 0]);
  });

  // ---------------------------------------------------------
  // Matrix operations
  // ---------------------------------------------------------
  test("identity() returns identity mat4", () => {
    const out = MathEngine.identity();
    expect(Array.from(out)).toEqual(Array.from(mat4.create()));
  });

  test("translate() builds translation matrix", () => {
    const out = MathEngine.translate([1, 2, 3]);
    const expected = mat4.create();
    mat4.translate(expected, expected, [1, 2, 3]);
    expect(Array.from(out)).toEqual(Array.from(expected));
  });

  test("scale() builds scale matrix", () => {
    const out = MathEngine.scale([2, 3, 4]);
    const expected = mat4.create();
    mat4.scale(expected, expected, [2, 3, 4]);
    expect(Array.from(out)).toEqual(Array.from(expected));
  });

  test("rotate() builds rotation matrix", () => {
    const out = MathEngine.rotate(Math.PI / 2, [0, 0, 1]);
    const expected = mat4.create();
    mat4.rotate(expected, expected, Math.PI / 2, [0, 0, 1]);
    expect(Array.from(out)).toEqual(Array.from(expected));
  });

  // ---------------------------------------------------------
  // Quaternion operations
  // ---------------------------------------------------------
  test("fromEuler() converts radians to quaternion", () => {
    const q = MathEngine.fromEuler([0, Math.PI / 2, 0]);

    const expected = quat.create();
    quat.fromEuler(expected, 0, 90, 0); // degrees

    expect(Array.from(q)).toEqual(Array.from(expected));
  });

  test("toEuler() converts quaternion to Euler radians", () => {
    const q = quat.create();
    quat.fromEuler(q, 0, 90, 0);

    const e = MathEngine.toEuler(q);

    expect(e[1]).toBeCloseTo(Math.PI / 2);
  });

  test("slerp() interpolates between quaternions", () => {
    const a = quat.create();
    const b = quat.create();
    quat.fromEuler(b, 0, 90, 0);

    const out = MathEngine.slerp(a, b, 0.5);

    const expected = quat.create();
    quat.slerp(expected, a, b, 0.5);

    expect(Array.from(out)).toEqual(Array.from(expected));
  });

  // ---------------------------------------------------------
  // Interpolation
  // ---------------------------------------------------------
  test("lerp() interpolates scalars", () => {
    expect(MathEngine.lerp(0, 10, 0.5)).toBe(5);
  });

  test("lerpVec3() interpolates vectors", () => {
    const out = MathEngine.lerpVec3([0, 0, 0], [10, 10, 10], 0.5);
    expect(Array.from(out)).toEqual([5, 5, 5]);
  });
});