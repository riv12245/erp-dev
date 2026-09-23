package com.erp.mobile

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Only AES-GCM ciphertext and a non-secret logout marker enter private preferences. */
class ErpSecureSessionModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val prefs = context.getSharedPreferences("erp_secure_session", Context.MODE_PRIVATE)
  private val alias = "erp.session.refresh.v1"
  override fun getName(): String = "ErpSecureSession"

  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    val existing = store.getKey(alias, null)
    if (existing is SecretKey) return existing
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
      init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
      generateKey()
    }
  }

  @ReactMethod fun read(promise: Promise) {
    try {
      val stored = prefs.getString("ciphertext", null)
      if (stored == null) { promise.resolve(null); return }
      val parts = stored.split(":")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
      promise.resolve(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8))
    } catch (error: Exception) {
      prefs.edit().remove("ciphertext").putBoolean("blocked", true).commit()
      promise.reject("SECURE_STORAGE", "Stored session could not be decrypted", error)
    }
  }

  @ReactMethod fun write(value: String?, promise: Promise) {
    try {
      val editor = prefs.edit()
      if (value == null) editor.remove("ciphertext") else {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        editor.putString("ciphertext", Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(encrypted, Base64.NO_WRAP))
      }
      check(editor.commit()) { "Unable to persist secure session" }
      promise.resolve(null)
    } catch (error: Exception) { promise.reject("SECURE_STORAGE", "Session storage failed", error) }
  }

  @ReactMethod fun blocked(promise: Promise) { promise.resolve(prefs.getBoolean("blocked", false)) }
  @ReactMethod fun block(value: Boolean, promise: Promise) {
    if (prefs.edit().putBoolean("blocked", value).commit()) promise.resolve(null)
    else promise.reject("SECURE_STORAGE", "Logout intent could not be persisted")
  }
}
