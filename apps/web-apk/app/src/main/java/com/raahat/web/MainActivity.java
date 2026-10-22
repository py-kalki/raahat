package com.raahat.web;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.Token;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import java.util.Collections;

/** A persistent entry screen: a failed browser handoff must never look like an app exit. */
public class MainActivity extends Activity {
    static final Uri HOME = Uri.parse("https://raahat-n1e2.onrender.com/");
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView status;
    private Button open;
    private CustomTabsServiceConnection connection;
    private boolean bound;
    private boolean pending;
    private Uri destination;
    static final int NOTIFICATION_PERMISSION = 41;
    private boolean openAfterPermission;
    private TextView notificationStatus;
    private final Runnable timeout = () -> showFailure("The browser did not respond. Try Open in browser, or update Chrome.");

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        destination = safeDestination(getIntent().getData());
        LinearLayout screen = new LinearLayout(this);
        screen.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        screen.setPadding(padding, padding * 3, padding, padding);
        screen.setBackgroundColor(Color.rgb(247, 248, 244));
        TextView title = new TextView(this);
        title.setText("Raah");
        title.setTextSize(30);
        title.setTextColor(Color.rgb(31, 58, 42));
        screen.addView(title);
        TextView version = new TextView(this);
        version.setText("Version 1.0.2 · Hosted demo");
        screen.addView(version);
        status = new TextView(this);
        status.setTextSize(17);
        status.setPadding(0, padding, 0, padding);
        status.setText("Raah uses your browser securely. Internet access is required.");
        screen.addView(status);
        open = new Button(this);
        open.setText("Open Raah");
        open.setOnClickListener(v -> beginLaunch());
        screen.addView(open);
        Button browser = new Button(this);
        browser.setText("Open in browser");
        browser.setOnClickListener(v -> openInBrowser());
        screen.addView(browser);
        notificationStatus = new TextView(this);
        notificationStatus.setPadding(0, padding, 0, padding / 2);
        screen.addView(notificationStatus);
        Button notifications = new Button(this);
        notifications.setText("Enable phone notifications");
        notifications.setOnClickListener(v -> enablePhoneNotifications());
        screen.addView(notifications);
        setContentView(screen);
        // Restoring or returning to the entry screen must not cause a launch loop.
        if (state == null) handler.post(this::beginLaunch);
    }

    boolean notificationPermissionMissing() {
        return Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED;
    }

    void beginLaunch() {
        if (notificationPermissionMissing() && !getPreferences(MODE_PRIVATE).getBoolean("notificationAsked", false)) {
            openAfterPermission = true;
            requestNotificationPermission();
        } else launch();
    }

    private void requestNotificationPermission() {
        getPreferences(MODE_PRIVATE).edit().putBoolean("notificationAsked", true).apply();
        status.setText("Allow notifications to receive corridor alerts outside the app. You can still use the app if you decline.");
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION);
    }

    void enablePhoneNotifications() {
        openAfterPermission = false;
        if (notificationPermissionMissing() && (!getPreferences(MODE_PRIVATE).getBoolean("notificationAsked", false)
                || shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS))) {
            requestNotificationPermission();
        } else {
            Intent settings = Build.VERSION.SDK_INT >= 26
                    ? new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())
                    : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
            try { startActivity(settings); }
            catch (RuntimeException error) { status.setText("Open Android Settings → Apps → Raah → Notifications to enable alerts."); }
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == NOTIFICATION_PERMISSION) {
            refreshNotificationStatus();
            if (openAfterPermission) { openAfterPermission = false; launch(); }
        }
    }

    @Override protected void onResume() {
        super.onResume();
        refreshNotificationStatus();
    }

    private void refreshNotificationStatus() {
        if (notificationStatus == null) return;
        boolean enabled = !notificationPermissionMissing()
                && androidx.core.app.NotificationManagerCompat.from(this).areNotificationsEnabled();
        notificationStatus.setText(enabled
                ? "Phone notifications allowed. Sign in and enable corridor notifications in the app to connect this account."
                : "Phone notifications are off. Enable them to receive alerts when the app is in the background.");
    }

    static Uri safeDestination(Uri uri) {
        return uri != null && "https".equals(uri.getScheme())
                && "raahat-n1e2.onrender.com".equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null
                ? uri : HOME;
    }

    protected String browserPackage() {
        return CustomTabsClient.getPackageName(this, Collections.singletonList("com.android.chrome"));
    }

    void launch() {
        if (pending || isFinishing() || isDestroyed()) return;
        releaseConnection();
        pending = true;
        open.setEnabled(false);
        status.setText("Opening Raah…");
        try {
            final String browser = browserPackage();
            if (browser == null) {
                showFailure("No compatible browser was found. Install or enable Chrome, or tap Open in browser.");
                return;
            }
            connection = new CustomTabsServiceConnection() {
                @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
                    if (!pending || isDestroyed()) return;
                    try {
                        CustomTabsSession session = client.newSession(new CustomTabsCallback());
                        if (session == null) {
                            showFailure("The browser could not start an app session. Tap Open in browser.");
                            return;
                        }
                        Token token = Token.create(browser, getPackageManager());
                        if (token != null) new SharedPreferencesTokenStore(MainActivity.this).store(token);
                        new TrustedWebActivityIntentBuilder(destination).build(session)
                                .launchTrustedWebActivity(MainActivity.this);
                        handler.removeCallbacks(timeout);
                        pending = false;
                        open.setEnabled(true);
                        status.setText("Raah opened in your browser. Tap Open Raah to return to it.");
                    } catch (RuntimeException | LinkageError error) {
                        showFailure("The app session could not open (" + error.getClass().getSimpleName()
                                + "). Tap Open in browser.");
                    }
                }
                @Override public void onServiceDisconnected(ComponentName name) {
                    if (pending) showFailure("The browser disconnected. Tap Open in browser or try again.");
                }
            };
            bound = CustomTabsClient.bindCustomTabsService(this, browser, connection);
            if (bound) handler.postDelayed(timeout, 5000);
            else showFailure("The browser could not connect. Tap Open in browser.");
        } catch (RuntimeException | LinkageError error) {
            showFailure("Could not start the browser (" + error.getClass().getSimpleName()
                    + "). Install or update Chrome, then try again.");
        }
    }

    void openInBrowser() {
        handler.removeCallbacks(timeout);
        pending = false;
        open.setEnabled(true);
        try {
            // Resolve a generic URL so Android cannot route the fallback back into this app.
            Intent probe = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.org/"));
            probe.addCategory(Intent.CATEGORY_BROWSABLE);
            Intent intent = new Intent(Intent.ACTION_VIEW, destination);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            for (ResolveInfo candidate : getPackageManager().queryIntentActivities(probe, 0)) {
                String name = candidate.activityInfo.packageName;
                if (name.equals(getPackageName())) continue;
                try {
                    intent.setPackage(name);
                    startActivity(intent);
                    status.setText("Opened in browser. You can return here at any time.");
                    return;
                } catch (RuntimeException ignored) { /* Try the next installed browser. */ }
            }
            showFailure("No browser is available. Enable or install Chrome, then tap Open Raah.");
        } catch (RuntimeException | LinkageError error) {
            showFailure("The browser could not open. Enable or update Chrome and try again.");
        }
    }

    private void showFailure(String message) {
        handler.removeCallbacks(timeout);
        pending = false;
        open.setEnabled(true);
        status.setText(message);
    }

    private void releaseConnection() {
        if (bound && connection != null) {
            try { unbindService(connection); } catch (RuntimeException ignored) { }
        }
        bound = false;
        connection = null;
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        releaseConnection();
        super.onDestroy();
    }
}
