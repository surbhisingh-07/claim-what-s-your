import type { CitizenProfile, EligibilityRuleResult, Scheme, SchemeMatch } from '../types'

const unknownValue = 'Not provided'

function formatIncome(value?: number) {
  return value == null
    ? unknownValue
    : `₹${value.toLocaleString('en-IN')} per year`
}

function evaluateRules(scheme: Scheme, profile: CitizenProfile): EligibilityRuleResult[] {
  const rules: EligibilityRuleResult[] = []

  if (scheme.state) {
    rules.push({
      rule: `${scheme.state} residency`,
      provided: profile.state || unknownValue,
      result: !profile.state ? 'unknown' : profile.state.toLowerCase() === scheme.state.toLowerCase() ? 'match' : 'miss',
    })
  }

  if (scheme.incomeLimit != null) {
    rules.push({
      rule: `Annual family income at or below ${formatIncome(scheme.incomeLimit)}`,
      provided: formatIncome(profile.annualIncome),
      result: profile.annualIncome == null ? 'unknown' : profile.annualIncome <= scheme.incomeLimit ? 'match' : 'miss',
    })
  }

  if (scheme.educationLevels?.length) {
    rules.push({
      rule: `Education: ${scheme.educationLevels.join(' or ')}`,
      provided: profile.educationLevel || unknownValue,
      result: !profile.educationLevel ? 'unknown' : scheme.educationLevels.includes(profile.educationLevel) ? 'match' : 'miss',
    })
  }

  if (scheme.courseKeywords?.length) {
    const course = profile.course?.toLowerCase()
    rules.push({
      rule: `Course related to ${scheme.courseKeywords.slice(0, 3).join(', ')}`,
      provided: profile.course || unknownValue,
      result: !course ? 'unknown' : scheme.courseKeywords.some((keyword) => course.includes(keyword)) ? 'match' : 'miss',
    })
  }

  if (scheme.minAge != null || scheme.maxAge != null) {
    const ageRange = [scheme.minAge, scheme.maxAge].filter((value) => value != null).join('–')
    rules.push({
      rule: `Age range ${ageRange}`,
      provided: profile.age == null ? unknownValue : `${profile.age} years`,
      result: profile.age == null
        ? 'unknown'
        : (scheme.minAge == null || profile.age >= scheme.minAge) &&
            (scheme.maxAge == null || profile.age <= scheme.maxAge)
          ? 'match'
          : 'miss',
    })
  }

  if (scheme.categories?.length) {
    rules.push({
      rule: `Category: ${scheme.categories.join(', ')}`,
      provided: profile.category || unknownValue,
      result: !profile.category ? 'unknown' : scheme.categories.includes(profile.category) ? 'match' : 'miss',
    })
  }

  if (scheme.gender) {
    rules.push({
      rule: `Gender criterion: ${scheme.gender}`,
      provided: profile.gender || unknownValue,
      result: !profile.gender ? 'unknown' : profile.gender === scheme.gender ? 'match' : 'miss',
    })
  }

  if (scheme.disability) {
    rules.push({
      rule: 'Disability-related criterion',
      provided: profile.disability || unknownValue,
      result: !profile.disability ? 'unknown' : profile.disability === scheme.disability ? 'match' : 'miss',
    })
  }

  if (scheme.firstGeneration) {
    rules.push({
      rule: 'First-generation student criterion',
      provided: profile.firstGeneration || unknownValue,
      result: !profile.firstGeneration
        ? 'unknown'
        : profile.firstGeneration === scheme.firstGeneration
          ? 'match'
          : 'miss',
    })
  }

  return rules
}

export function matchSchemes(schemes: Scheme[], profile: CitizenProfile): SchemeMatch[] {
  return schemes
    .filter((scheme) => scheme.active)
    .map((scheme) => {
      const rules = evaluateRules(scheme, profile)
      const matchedCount = rules.filter((rule) => rule.result === 'match').length
      const missingCount = rules.filter((rule) => rule.result === 'unknown').length
      const strength: SchemeMatch['strength'] = rules.some((rule) => rule.result === 'miss')
        ? 'More information needed'
        : missingCount > 0
          ? 'Possible match'
          : 'Strong match'

      return { scheme, rules, strength, matchedCount, missingCount }
    })
    .filter((match) => !match.rules.some((rule) => rule.result === 'miss'))
    .filter((match) => match.matchedCount > 0)
    .sort((left, right) => {
      const scoreDifference = right.matchedCount - left.matchedCount
      return scoreDifference || left.missingCount - right.missingCount
    })
}
