export function assertNotReachable(..._any: never[]): never {
  console.error(..._any)
  console.error(new Error('').stack)
  throw new Error('boom! this line should not be reached!!')
}
