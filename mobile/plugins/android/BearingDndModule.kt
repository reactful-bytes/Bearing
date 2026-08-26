package __PACKAGE_NAME__

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BearingDndModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {
  private var previousInterruptionFilter: Int? = null
  private var changedByBearing = false

  private val notificationManager: NotificationManager
    get() = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun getName() = "BearingDnd"

  override fun initialize() {
    super.initialize()
    reactContext.addLifecycleEventListener(this)
  }

  override fun invalidate() {
    restoreOnHostShutdown()
    reactContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  @ReactMethod
  fun isPolicyAccessGranted(promise: Promise) {
    promise.resolve(notificationManager.isNotificationPolicyAccessGranted)
  }

  @ReactMethod
  fun openPolicyAccessSettings(promise: Promise) {
    val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    if (intent.resolveActivity(reactContext.packageManager) == null) {
      promise.reject("E_DND_SETTINGS_UNAVAILABLE", "Do Not Disturb access settings are unavailable on this device.")
      return
    }

    try {
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_DND_SETTINGS", "Unable to open Do Not Disturb access settings.", error)
    }
  }

  @ReactMethod
  @Synchronized
  fun beginPriorityMode(promise: Promise) {
    if (!notificationManager.isNotificationPolicyAccessGranted) {
      promise.reject("E_DND_ACCESS", "Do Not Disturb access has not been granted to Bearing.")
      return
    }

    if (changedByBearing) {
      promise.resolve(true)
      return
    }

    val currentFilter = notificationManager.currentInterruptionFilter
    if (currentFilter == NotificationManager.INTERRUPTION_FILTER_PRIORITY) {
      promise.resolve(false)
      return
    }

    try {
      previousInterruptionFilter = currentFilter
      notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
      changedByBearing = true
      promise.resolve(true)
    } catch (error: SecurityException) {
      previousInterruptionFilter = null
      promise.reject("E_DND_ACCESS", "Bearing no longer has Do Not Disturb access.", error)
    } catch (error: RuntimeException) {
      previousInterruptionFilter = null
      promise.reject("E_DND_ACTIVATE", "Unable to activate priority-only Do Not Disturb.", error)
    }
  }

  @ReactMethod
  fun endPriorityMode(promise: Promise) {
    try {
      promise.resolve(restoreBearingChange())
    } catch (error: SecurityException) {
      promise.reject("E_DND_ACCESS", "Bearing no longer has Do Not Disturb access.", error)
    } catch (error: RuntimeException) {
      promise.reject("E_DND_RESTORE", "Unable to restore Do Not Disturb.", error)
    }
  }

  @Synchronized
  private fun restoreBearingChange(): Boolean {
    if (!changedByBearing) {
      return false
    }

    val previousFilter = previousInterruptionFilter
    changedByBearing = false
    previousInterruptionFilter = null

    if (!notificationManager.isNotificationPolicyAccessGranted) {
      return false
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
      return true
    }

    if (
      previousFilter != null &&
      notificationManager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_PRIORITY
    ) {
      notificationManager.setInterruptionFilter(previousFilter)
      return true
    }

    return false
  }

  private fun restoreOnHostShutdown() {
    try {
      restoreBearingChange()
    } catch (error: RuntimeException) {
      Log.e(NAME, "Unable to restore Do Not Disturb while shutting down the React host.", error)
    }
  }

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    restoreOnHostShutdown()
  }

  companion object {
    private const val NAME = "BearingDnd"
  }
}