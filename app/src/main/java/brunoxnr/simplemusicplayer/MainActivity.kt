package brunoxnr.simplemusicplayer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import brunoxnr.simplemusicplayer.ui.MainScreen
import brunoxnr.simplemusicplayer.ui.MusicViewModel
import brunoxnr.simplemusicplayer.ui.screens.PermissionGate
import brunoxnr.simplemusicplayer.ui.theme.SimpleMusicTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SimpleMusicTheme {
                val vm: MusicViewModel = viewModel()
                PermissionGate(onGranted = vm::onPermissionGranted) {
                    MainScreen(vm)
                }
            }
        }
    }
}
