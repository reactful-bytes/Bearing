package __PACKAGE_NAME__

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

@Suppress("DEPRECATION")
class BearingDndPackage : ReactPackage {
  @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): MutableList<NativeModule> = mutableListOf(BearingDndModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): MutableList<ViewManager<*, *>> = mutableListOf()
}