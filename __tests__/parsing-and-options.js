const fs = require('fs')
const fetch = require('node-fetch')

const {
  structuredDataTest,
  structuredDataTestUrl
} = require('../index')
const presets = require('../presets')

const testFile = '__tests__/fixtures/example.html'
const html = fs.readFileSync(testFile)

// Used to hold the test result that is used across these tests
let structuredDataTestResult = null

describe('Parsing and options', () => {
  beforeAll(async () => {
    // Mock fetch request
    fetch.resetMocks()
    fetch.mockResponse(html);

    // @TODO This test uses a single fixture for all tests
    // Ideally there would be multiple different fixtures that more robustly
    // test different scenarios, but this is is a practical approach that gives
    // good coverage with minimal effort.
    await structuredDataTest(html, { presets: [ presets.Google, presets.Twitter ]})
    .then(response => { structuredDataTestResult = response })
    .catch(err => { structuredDataTestResult = err.res })
  })

  afterAll(() => {
    fetch.resetMocks()
  })

  // @FIXME This test covers too much at once, should split out error handling checks
  // @FIXME This test also tests ever preset for coverage - that should move to the presets test file
  test('should validate all structured data schemas found as well as any presets specified and handle errors correctly', async () => {
    // Should validate schemas found, but also find errors as Facebook schema should not
    // be present in the example, but is passed as a preset so the test should fail.
    const result = await structuredDataTest(html, { presets: Object.keys(presets).map(preset => presets[preset]) })
    .then(response => response)
    .catch(err => err.res)
    
    expect(result.schemas.length).toEqual(4)
    expect(result.schemas.includes('Facebook')).toBeFalsy()
    expect(result.passed.length).toBeGreaterThan(4)
    expect(result.failed.length).toBeGreaterThan(0)
  })

  test('should run all tests passed as options and for any schemas found', async () => {
    const options = {
      tests: [
        { test: 'ReportageNewsArticle', expect: true },
        { test: 'ReportageNewsArticle[*]."@type"', expect: 'ReportageNewsArticle' },
        { test: 'ReportageNewsArticle[*]."@context"', expect: 'http://schema.org' },
        { test: 'ReportageNewsArticle[*].url', expect: 'http://example.com/path-to-article', type: 'any' },
        { test: 'ReportageNewsArticle[*].headline', expect: 'Example Headline in JSON-LD', type: 'jsonld' },
        { test: 'Article[*].headline', expect: 'Example Headline in Microdata', type: 'microdata' },
        { test: 'NewsArticle[*].headline', expect: 'Example Headline in RDFa', type: 'rdfa' },
        { test: '"twitter:card"', expect: 'summary_large_image', type: 'metatag' }
      ]
    }
    try {
      const result = await structuredDataTestUrl("https://example.com", options)
      expect(result.passed.length).toBeGreaterThan(8)
      expect(result.failed.length).toEqual(0)
    } catch (e) {
      console.error("Failing tests:", e.failed)
      throw e
    }
  })

  test('should run all tests passed as options and for any schemas found and any presets specified', async () => {
    const options = {
      tests: [
        { test: 'ReportageNewsArticle', expect: true },
        { test: 'ReportageNewsArticle[*]."@type"', expect: 'ReportageNewsArticle' },
        { test: 'ReportageNewsArticle[*]."@context"', expect: 'http://schema.org' },
        { test: 'ReportageNewsArticle[*].url', expect: 'http://example.com/path-to-article', type: 'any' },
        { test: 'ReportageNewsArticle[*].headline', expect: 'Example Headline in JSON-LD', type: 'jsonld' },
        { test: 'Article[*].headline', expect: 'Example Headline in Microdata', type: 'microdata' },
        { test: 'NewsArticle[*].headline', expect: 'Example Headline in RDFa', type: 'rdfa' },
        { test: '"twitter:card"', expect: 'summary_large_image', type: 'metatag' },
        { test: '"twitter:description"', }, // Should find and assume is expected
        { test: '"should-not-exist"', expect: false, type: 'metatag' }
      ],
      presets: [ presets.Twitter ]
    }
    try {
      const result = await structuredDataTestUrl("https://example.com", options)
      expect(result.passed.length).toBeGreaterThan(10)
      expect(result.failed.length).toEqual(0)
    } catch (e) {
      console.error("Failing tests:", e)
      throw e
    }
  })

  // Test for fix that addresses issue:
  // https://github.com/glitchdigital/structured-data-testing-tool/issues/4
  test('should be able to detect complex structured data', async () => {
    expect(structuredDataTestResult.structuredData.microdata.SocialMediaPosting[0].publisher).toEqual('ACME')
    expect(structuredDataTestResult.structuredData.microdata.SocialMediaPosting[0].Organization).toEqual('ACME')
    expect(structuredDataTestResult.structuredData.microdata.SocialMediaPosting[0].image.url).toEqual('http://example.com/path-to-article-image.jpg')
    expect(structuredDataTestResult.structuredData.microdata.SocialMediaPosting[0].associatedMedia.url).toEqual('http://example.com/path-to-article-image.jpg')
  })
})
