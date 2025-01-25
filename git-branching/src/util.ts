export function failWith(errorMessage: string | (() => string)): never {
  if (typeof errorMessage === "string") {
    throw new Error(errorMessage);
  }
  throw new Error(errorMessage());
}
