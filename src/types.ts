export type EducationLevel =
  | 'High school'
  | 'Diploma'
  | 'Undergraduate'
  | 'Postgraduate'
  | 'Other'

export interface CitizenProfile {
  age?: number
  state?: string
  district?: string
  educationLevel?: EducationLevel
  course?: string
  institutionType?: string
  annualIncome?: number
  category?: string
  gender?: string
  disability?: string
  firstGeneration?: string
}

export interface Scheme {
  id: string
  name: string
  description: string
  benefit: string
  state: string
  targetGroup: string
  incomeLimit?: number
  minAge?: number
  maxAge?: number
  educationLevels?: EducationLevel[]
  courseKeywords?: string[]
  categories?: string[]
  gender?: string
  disability?: string
  firstGeneration?: string
  documents: string[]
  steps: string[]
  deadline?: string
  officialUrl?: string
  sourceName: string
  lastVerifiedDate?: string
  active: boolean
  sample: boolean
}

export type RuleResult = 'match' | 'miss' | 'unknown'

export interface EligibilityRuleResult {
  rule: string
  provided: string
  result: RuleResult
}

export interface SchemeMatch {
  scheme: Scheme
  rules: EligibilityRuleResult[]
  strength: 'Strong match' | 'Possible match' | 'More information needed'
  matchedCount: number
  missingCount: number
}

export type ApplicationStatus =
  | 'Not started'
  | 'Documents pending'
  | 'Ready to apply'
  | 'Applied'
  | 'Under review'
  | 'Action required'
  | 'Approved'
  | 'Rejected'
  | 'Completed'

export interface TrackedApplication {
  id: string
  schemeId: string
  status: ApplicationStatus
  applicationDate?: string
  expectedDeadline?: string
  notes: string
  updatedAt: string
}

export type DocumentStatus = 'Not started' | 'Ready' | 'Prepared'
export type DocumentChecklist = Record<string, DocumentStatus>
