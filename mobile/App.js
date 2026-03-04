import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  // Thay thế localhost thành IP của máy bạn trong mạng LAN hoặc 10.0.2.2 đối với Android Emulator
  // VD: uri: 'http://192.168.1.xxx:5173/'
  // Tạm thời mình trỏ về localhost cho quá trình phát triển (với iOS Simulator),
  // đối với Android Emulator có thể cần dùng 10.0.2.2
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: 'http://localhost:5173' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});
