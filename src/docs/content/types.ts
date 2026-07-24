export interface Callout {
  type: 'info' | 'tip' | 'warning' | 'danger'
  title: string
  text: string
}

export interface CodeExample {
  filename?: string
  language: string
  code: string
}

export interface ContentTable {
  headers: string[]
  rows: string[][]
}

export interface DocSection {
  id:      string
  heading: string
  body?:   string
  list?:   string[]
  table?:  ContentTable
  code?:   CodeExample
  callout?: Callout
  subsections?: DocSection[]
}

export interface DocNavLink {
  label: string
  path:  string
}

export interface DocPage {
  slug:        string
  title:       string
  description: string
  sections:    DocSection[]
  prev?:       DocNavLink
  next?:       DocNavLink
}