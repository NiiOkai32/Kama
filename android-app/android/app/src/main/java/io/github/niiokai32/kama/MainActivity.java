package io.github.niiokai32.kama;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;

/** Bundled pages under the owner's HTTPS origin; no remote main-frame pages or file URLs. */
public final class MainActivity extends Activity {
    private static final String HOST = "niiokai32.github.io";
    private static final String PREFIX = "/Kama/";
    private static final String HOME = "https://" + HOST + PREFIX + "index.html";
    private static final String API_HOST = "eqvzzfivcujfwdfdvodm.supabase.co";
    private static final int PICK_FILE = 41;
    private static final int SAVE_DECK = 42;
    private WebView web;
    private FrameLayout root;
    private ValueCallback<Uri[]> fileResult;
    private String deckToSave;
    private volatile boolean bridgeEnabled;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (!BuildConfig.DEBUG) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(21, 18, 22));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return insets;
            });
        }
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::back);
        }
        createWebView();
        android.content.pm.PackageInfo engine = WebView.getCurrentWebViewPackage();
        if (engine != null) {
            try {
                int major = Integer.parseInt(engine.versionName.split("\\.")[0]);
                if (major < 105) {
                    showError("Update Android System WebView", "Kama needs a current Android System WebView. Update it in Google Play, then reopen the app.");
                    return;
                }
            } catch (NumberFormatException ignored) { }
        }
        web.loadUrl(HOME);
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void createWebView() {
        // The interface is exposed only to signed, bundled assets. All external
        // navigation opens outside this WebView; imports render text, never HTML.
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(21, 18, 22));
        web.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_YES);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // SAF-selected input files, not main-frame navigation.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(false);
        settings.setTextZoom(Math.min(180, Math.round(getResources().getConfiguration().fontScale * 100)));
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(new DeviceBridge(), "KamaAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                bridgeEnabled = isLocal(Uri.parse(url));
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri)) return asset(uri, request.getMethod());
                String scheme = uri.getScheme();
                if (!request.isForMainFrame() && "https".equals(scheme) && API_HOST.equals(uri.getHost())) return null;
                if ("data".equals(scheme) || "blob".equals(scheme)) return null;
                return response(403, "Forbidden", "text/plain", "This resource is not part of Kama.");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isLocal(request.getUrl())) return false;
                if (request.isForMainFrame() && "https".equals(request.getUrl().getScheme())) openBrowser(request.getUrl());
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (isLocal(Uri.parse(url)) && Uri.parse(url).getPath().endsWith("quiet.html")) view.clearHistory();
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                root.removeView(view); view.destroy(); web = null; bridgeEnabled = false;
                showError("Let’s reopen Kama", "Android closed the game to free memory. Your saved cards are still on this device.");
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public boolean onConsoleMessage(ConsoleMessage message) { return true; } // Do not log private content.
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> result, FileChooserParams params) {
                if (!bridgeEnabled) { result.onReceiveValue(null); return true; }
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = result;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/webp", "application/json", "text/plain"});
                pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivityForResult(pick, PICK_FILE); }
                catch (ActivityNotFoundException error) { fileResult.onReceiveValue(null); fileResult = null; toast("No file picker is available on this device."); }
                return true;
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPort() == -1
                && uri.getPath() != null && uri.getPath().startsWith(PREFIX) && uri.getUserInfo() == null;
    }
    private WebResourceResponse asset(Uri uri, String method) {
        if (!"GET".equals(method)) return response(405, "Method Not Allowed", "text/plain", "Use a game action.");
        String name = uri.getPath().substring(PREFIX.length());
        if (name.isEmpty()) name = "index.html";
        if (name.contains("..") || name.contains("\\") || name.indexOf('\0') >= 0 || !name.matches("[A-Za-z0-9_./-]+")) {
            return response(403, "Forbidden", "text/plain", "Invalid asset path.");
        }
        String mime = name.endsWith(".html") ? "text/html" : name.endsWith(".css") ? "text/css" : name.endsWith(".js") ? "application/javascript" : name.endsWith(".svg") ? "image/svg+xml" : "text/plain";
        try { return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers(), getAssets().open("web/" + name)); }
        catch (IOException error) { return response(404, "Not Found", "text/plain", "That screen is not in this version of Kama."); }
    }
    private static Map<String, String> headers() {
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-store"); h.put("Referrer-Policy", "no-referrer"); h.put("X-Content-Type-Options", "nosniff");
        return h;
    }
    private static WebResourceResponse response(int status, String reason, String type, String body) {
        InputStream stream = new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8));
        return new WebResourceResponse(type, "UTF-8", status, reason, headers(), stream);
    }
    private void openBrowser(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException error) { toast("No browser is available."); }
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }
    private void showError(String title, String text) {
        root.removeAllViews();
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(32, 48, 32, 32);
        TextView heading = new TextView(this); heading.setText(title); heading.setTextSize(26); heading.setTextColor(Color.WHITE);
        TextView details = new TextView(this); details.setText(text); details.setTextSize(17); details.setTextColor(Color.LTGRAY); details.setPadding(0, 20, 0, 24);
        Button retry = new Button(this); retry.setText("Reopen"); retry.setOnClickListener(view -> recreate());
        layout.addView(heading); layout.addView(details); layout.addView(retry); root.addView(layout);
    }
    public final class DeviceBridge {
        @JavascriptInterface public boolean isAndroidApp() { return bridgeEnabled; }
        @JavascriptInterface public void copyText(String text) {
            if (!bridgeEnabled || text == null || text.length() > 16000) return;
            runOnUiThread(() -> {
                if (!bridgeEnabled) return;
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("Kama", text));
            });
        }
        @JavascriptInterface public void saveDeck(String json) {
            if (!bridgeEnabled || json == null || json.length() > 1000000) return;
            try { JSONObject data = new JSONObject(json); if (data.getInt("version") != 1 || data.getJSONArray("cards").length() > 1000) return; }
            catch (Exception invalid) { return; }
            runOnUiThread(() -> {
                if (!bridgeEnabled || deckToSave != null) return;
                deckToSave = json;
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT); save.addCategory(Intent.CATEGORY_OPENABLE);
                save.setType("application/json"); save.putExtra(Intent.EXTRA_TITLE, "my-cards.json");
                try { startActivityForResult(save, SAVE_DECK); }
                catch (ActivityNotFoundException error) { deckToSave = null; toast("No document app is available to save your deck."); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE && fileResult != null) {
            fileResult.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileResult = null;
        } else if (request == SAVE_DECK) {
            String json = deckToSave; deckToSave = null;
            if (result == RESULT_OK && json != null && data != null && data.getData() != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData(), "wt")) {
                    if (output == null) throw new IOException("No document stream");
                    output.write(json.getBytes(StandardCharsets.UTF_8)); toast("Deck saved.");
                } catch (IOException error) { toast("Could not save that deck. Please try again."); }
            }
        }
    }
    @Override public void onBackPressed() { back(); }
    private void back() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(d){if(d.id==='ageGate'||d.id==='passwordDialog')return 'exit';d.close();return 'handled'}return location.pathname.endsWith('quiet.html')?'exit':'history'})()", value -> {
            if ("\"handled\"".equals(value)) return;
            if (!"\"exit\"".equals(value) && web != null && web.canGoBack()) web.goBack(); else finish();
        });
    }
    @Override protected void onPause() { if (web != null) web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override public void onConfigurationChanged(Configuration configuration) { super.onConfigurationChanged(configuration); root.requestApplyInsets(); }
    @Override protected void onDestroy() {
        bridgeEnabled = false;
        if (fileResult != null) fileResult.onReceiveValue(null);
        if (web != null) { web.removeJavascriptInterface("KamaAndroid"); web.destroy(); }
        super.onDestroy();
    }
}
