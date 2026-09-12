const {
  findMatchingBracketEnd,
  unwrapOuterBraces,
  findModelCalls,
  extractField,
  extractNumberField,
  extractRefVar,
  extractTopLevelField,
  splitTopLevelObjects,
  collectIdFields,
  extractStringArrayField,
} = require("../../scripts/audit/lib/parseUtils");

describe("audit/parseUtils — findMatchingBracketEnd", () => {
  test("matches a simple object literal", () => {
    const text = 'const x = { a: 1, b: { c: 2 } };';
    const open = text.indexOf("{");
    const end = findMatchingBracketEnd(text, open);
    expect(text.slice(open, end)).toBe("{ a: 1, b: { c: 2 } }");
  });

  test("ignores braces inside strings", () => {
    const text = '{ label: "a { fake brace" }';
    const end = findMatchingBracketEnd(text, 0);
    expect(end).toBe(text.length);
  });

  test("ignores braces inside comments", () => {
    const text = "{ a: 1 /* { not a brace */ }";
    const end = findMatchingBracketEnd(text, 0);
    expect(end).toBe(text.length);
  });

  test("returns -1 when unbalanced", () => {
    const text = "{ a: 1";
    expect(findMatchingBracketEnd(text, 0)).toBe(-1);
  });
});

describe("audit/parseUtils — unwrapOuterBraces", () => {
  test("strips exactly one matching outer brace pair", () => {
    expect(unwrapOuterBraces('{ a: 1, b: 2 }')).toBe(" a: 1, b: 2 ");
  });

  test("leaves non-wrapped text unchanged", () => {
    expect(unwrapOuterBraces("a: 1, b: 2")).toBe("a: 1, b: 2");
  });

  test("leaves text unchanged if opening brace isn't the whole wrapper (e.g. two siblings)", () => {
    const text = "{ a: 1 }, { b: 2 }";
    expect(unwrapOuterBraces(text)).toBe(text);
  });
});

describe("audit/parseUtils — findModelCalls", () => {
  test("finds a .create({...}) call and its assigned var", () => {
    const text = 'const subject = await Subject.create({ name: "Biology", grade: 11 });';
    const calls = findModelCalls(text, "Subject", "create");
    expect(calls).toHaveLength(1);
    expect(calls[0].assignedVar).toBe("subject");
    expect(calls[0].argsText).toBe('{ name: "Biology", grade: 11 }');
  });

  test("finds a reassignment (no const/let) inside an if-guard", () => {
    const text = [
      "let subject = await Subject.findOne({ grade: 11, name: /biology/i });",
      "if (!subject) {",
      '  subject = await Subject.create({ name: "Biology", grade: 11 });',
      "}",
    ].join("\n");
    const creates = findModelCalls(text, "Subject", "create");
    const findOnes = findModelCalls(text, "Subject", "findOne");
    expect(creates).toHaveLength(1);
    expect(creates[0].assignedVar).toBe("subject");
    expect(findOnes).toHaveLength(1);
    expect(findOnes[0].assignedVar).toBe("subject");
  });

  test("handles multiple calls in one file independently", () => {
    const text = `
      const ch4 = await Chapter.create({ title: "Animal Kingdom", order_index: 4 });
      const ch5 = await Chapter.create({ title: "Plant Kingdom", order_index: 5 });
    `;
    const calls = findModelCalls(text, "Chapter", "create");
    expect(calls.map((c) => c.assignedVar)).toEqual(["ch4", "ch5"]);
  });
});

describe("audit/parseUtils — extractField / extractNumberField", () => {
  test("extractField reads a quoted string field anywhere in the blob", () => {
    expect(extractField('{ name: "Biology", grade: 11 }', "name")).toBe("Biology");
  });

  test("extractField returns null for a regex-literal field (can't read it)", () => {
    expect(extractField("{ grade: 11, name: /biology|science/i }", "name")).toBeNull();
  });

  test("extractNumberField reads a numeric field", () => {
    expect(extractNumberField('{ name: "Biology", grade: 11 }', "grade")).toBe(11);
  });
});

describe("audit/parseUtils — extractRefVar", () => {
  test("reads a `foo_id: var._id` reference", () => {
    expect(extractRefVar("{ subject_id: subject._id, title: \"X\" }", "subject_id")).toBe(
      "subject",
    );
  });

  test("returns null when the field is absent", () => {
    expect(extractRefVar('{ title: "X" }', "subject_id")).toBeNull();
  });
});

describe("audit/parseUtils — extractTopLevelField", () => {
  test("reads a field at the top level of a full .create({...}) argsText blob (regression: outer-brace bug)", () => {
    const argsText =
      '{ game_type: "BIO_DIAGNOSIS", concept_id: concept._id, title: level.title }';
    expect(extractTopLevelField(argsText, "game_type")).toBe("BIO_DIAGNOSIS");
  });

  test("does NOT match a same-named field nested one level deeper", () => {
    const argsText =
      '{ title: "Outer", payload: { title: "Inner should not match" } }';
    expect(extractTopLevelField(argsText, "title")).toBe("Outer");
  });

  test("reads a numeric top-level field", () => {
    const argsText = "{ order_index: 4, title: \"X\" }";
    expect(extractTopLevelField(argsText, "order_index", { isString: false })).toBe(4);
  });

  test("returns null when field is absent", () => {
    expect(extractTopLevelField('{ title: "X" }', "game_type")).toBeNull();
  });
});

describe("audit/parseUtils — splitTopLevelObjects", () => {
  test("splits sibling objects and ignores nested braces/commas", () => {
    const inner = `
      { title: "A", payload: { a: 1, b: 2 } },
      { title: "B", payload: { c: [1, 2, 3] } }
    `;
    const objs = splitTopLevelObjects(inner);
    expect(objs).toHaveLength(2);
    expect(objs[0]).toContain('"A"');
    expect(objs[1]).toContain('"B"');
  });

  test("ignores commas/braces inside strings", () => {
    const inner = `{ title: "A, B { C }" }`;
    const objs = splitTopLevelObjects(inner);
    expect(objs).toHaveLength(1);
  });
});

describe("audit/parseUtils — collectIdFields", () => {
  test("collects every id: field including duplicates", () => {
    const text = '{ evidence: [{ id: "ev1" }, { id: "ev2" }, { id: "ev1" }] }';
    expect(collectIdFields(text)).toEqual(["ev1", "ev2", "ev1"]);
  });
});

describe("audit/parseUtils — extractStringArrayField", () => {
  test("reads a string array field", () => {
    const text = '{ correct_piece_ids: ["ev1", "ev3"] }';
    expect(extractStringArrayField(text, "correct_piece_ids")).toEqual(["ev1", "ev3"]);
  });

  test("returns [] for an empty array (present but empty)", () => {
    expect(extractStringArrayField("{ correct_order: [] }", "correct_order")).toEqual([]);
  });

  test("returns null when field is absent", () => {
    expect(extractStringArrayField('{ foo: "bar" }', "correct_order")).toBeNull();
  });
});
