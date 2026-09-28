/** En person i personalregistret. */
export interface Person {
  id: string
  name: string
  role: string
}

export interface Team {
  id: string
  name: string
  memberIds: string[]
}
