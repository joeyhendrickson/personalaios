/**
 * Simple test function to verify encrypt/decrypt roundtrip
 *
 * Run this with: npx tsx src/lib/crypto.test.ts
 * Or add to a test file if you have a test framework
 */

import { encrypt, decrypt } from './crypto'

export function testEncryptDecrypt() {
  console.log('Testing encrypt/decrypt roundtrip...\n')

  const testCases = [
    'test-token-12345',
    'a'.repeat(100), // Long string
    'special-chars-!@#$%^&*()',
    'unicode-测试-🚀',
  ]

  let passed = 0
  let failed = 0

  for (const plaintext of testCases) {
    try {
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      if (decrypted === plaintext) {
        console.log(`✅ PASS: "${plaintext.substring(0, 30)}${plaintext.length > 30 ? '...' : ''}"`)
        passed++
      } else {
        console.error(`❌ FAIL: Decrypted text doesn't match original`)
        console.error(`   Original: ${plaintext}`)
        console.error(`   Decrypted: ${decrypted}`)
        failed++
      }
    } catch (error) {
      console.error(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

  if (failed === 0) {
    console.log('✅ All tests passed!')
    return true
  } else {
    console.log('❌ Some tests failed!')
    return false
  }
}

// Run if executed directly
if (require.main === module) {
  testEncryptDecrypt()
}
