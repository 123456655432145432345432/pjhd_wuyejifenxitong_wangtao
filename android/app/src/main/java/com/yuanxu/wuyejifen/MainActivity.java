package com.yuanxu.wuyejifen;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 关闭 Android WebView 边缘过滚动拉伸（橡皮筋效果）
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
  }
}
