package brunoxnr.simplemusicplayer

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import brunoxnr.simplemusicplayer.ui.MainScreen
import brunoxnr.simplemusicplayer.ui.MusicViewModel
import brunoxnr.simplemusicplayer.ui.screens.PermissionGate
import brunoxnr.simplemusicplayer.ui.theme.SimpleMusicTheme

// AppCompatActivity (not ComponentActivity) so the in-app language and light/dark choices apply
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val settings = (application as MusicApplication).settings
        setContent {
            val themeColor by settings.themeColor.collectAsStateWithLifecycle()
            SimpleMusicTheme(themeColor) {
                val vm: MusicViewModel = viewModel()
                PermissionGate(onGranted = vm::onPermissionGranted) {
                    MainScreen(vm)
                }
            }
        }
    }
}
