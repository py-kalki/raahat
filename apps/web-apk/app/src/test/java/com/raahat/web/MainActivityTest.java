package com.raahat.web;

import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import android.view.ViewGroup;
import android.widget.TextView;
import org.junit.Test;
import org.junit.Before;
import android.Manifest;
import android.content.pm.PackageManager;
import org.robolectric.RuntimeEnvironment;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;
import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
@LooperMode(LooperMode.Mode.PAUSED)
public class MainActivityTest {
    @Before public void allowNotificationsByDefault() {
        shadowOf(RuntimeEnvironment.getApplication()).grantPermissions(Manifest.permission.POST_NOTIFICATIONS);
    }

    @Test public void android15RequestsNotificationPermissionBeforeBrowserLaunch() {
        shadowOf(RuntimeEnvironment.getApplication()).denyPermissions(Manifest.permission.POST_NOTIFICATIONS);
        try (ActivityController<MainActivity> controller = Robolectric.buildActivity(MainActivity.class).setup()) {
            MainActivity activity = controller.get();
            shadowOf(Looper.getMainLooper()).idle();
            assertArrayEquals(new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    shadowOf(activity).getLastRequestedPermission().requestedPermissions);
            assertTrue(status(activity).contains("Allow notifications"));
            assertEquals("android.content.pm.action.REQUEST_PERMISSIONS",
                    shadowOf(activity).getNextStartedActivity().getAction());
            assertNull(shadowOf(activity).getNextStartedActivity());
            // Denial must still allow the app to open and must not repeatedly prompt.
            activity.onRequestPermissionsResult(MainActivity.NOTIFICATION_PERMISSION,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, new int[]{PackageManager.PERMISSION_DENIED});
            assertTrue(status(activity).contains("No compatible browser"));
            assertFalse(activity.isFinishing());
        }
    }

    @Test public void blockedNotificationsOfferAndroidSettings() {
        shadowOf(RuntimeEnvironment.getApplication()).denyPermissions(Manifest.permission.POST_NOTIFICATIONS);
        try (ActivityController<MainActivity> controller = Robolectric.buildActivity(MainActivity.class).setup()) {
            MainActivity activity = controller.get();
            shadowOf(Looper.getMainLooper()).idle();
            activity.enablePhoneNotifications();
            assertEquals(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS,
                    shadowOf(activity).getNextStartedActivity().getAction());
        }
    }
    private String status(MainActivity activity) {
        ViewGroup content = activity.findViewById(android.R.id.content);
        ViewGroup layout = (ViewGroup) content.getChildAt(0);
        return ((TextView) layout.getChildAt(2)).getText().toString();
    }

    @Test public void android15WithoutBrowserKeepsAppVisible() {
        try (ActivityController<MainActivity> controller = Robolectric.buildActivity(MainActivity.class).setup()) {
            MainActivity activity = controller.get();
            shadowOf(Looper.getMainLooper()).idle();
            assertFalse(activity.isFinishing());
            assertTrue(status(activity).contains("No compatible browser"));
            activity.openInBrowser();
            assertFalse(activity.isFinishing());
            assertTrue(status(activity).contains("No browser is available"));
            assertNull(shadowOf(activity).getNextStartedActivity());
        }
    }

    public static class FailingBrowserActivity extends MainActivity {
        @Override protected String browserPackage() { throw new IllegalStateException("unavailable"); }
    }

    @Test public void browserExceptionBecomesVisibleErrorInsteadOfCrash() {
        try (ActivityController<FailingBrowserActivity> controller = Robolectric.buildActivity(FailingBrowserActivity.class).setup()) {
            MainActivity activity = controller.get();
            shadowOf(Looper.getMainLooper()).idle();
            assertFalse(activity.isFinishing());
            assertTrue(status(activity).contains("IllegalStateException"));
            activity.launch();
            assertFalse(activity.isFinishing());
        }
    }

    @Test public void recreationDoesNotAutomaticallyLaunchAgain() {
        try (ActivityController<MainActivity> controller = Robolectric.buildActivity(MainActivity.class).create(new Bundle()).start().resume()) {
            shadowOf(Looper.getMainLooper()).idle();
            assertTrue(status(controller.get()).contains("Internet access is required"));
            assertNull(shadowOf(controller.get()).getNextStartedActivity());
        }
    }

    @Test public void incomingLinksStayOnTheTrustedOrigin() {
        assertEquals(MainActivity.HOME, MainActivity.safeDestination(Uri.parse("https://evil.example/")));
        assertEquals(MainActivity.HOME, MainActivity.safeDestination(Uri.parse("http://raahat-n1e2.onrender.com/")));
        assertEquals(MainActivity.HOME, MainActivity.safeDestination(Uri.parse("https://raahat-n1e2.onrender.com:9999/")));
        Uri officer = Uri.parse("https://raahat-n1e2.onrender.com/officer");
        assertEquals(officer, MainActivity.safeDestination(officer));
    }

    @Test public void delegatedNotificationHasAnIconAndHighPriorityChannel() {
        org.robolectric.android.controller.ServiceController<RaahatBrowserService> controller =
                     Robolectric.buildService(RaahatBrowserService.class).create();
        try {
            RaahatBrowserService service = controller.get();
            assertEquals(R.drawable.ic_notification, service.onGetSmallIconId());
            assertNotNull(service.onGetSmallIconBitmap().getParcelable(
                    androidx.browser.trusted.TrustedWebActivityService.KEY_SMALL_ICON_BITMAP));
            android.app.Notification notification = new android.app.Notification.Builder(service, "incoming")
                    .setSmallIcon(R.drawable.ic_notification).setContentTitle("Raah test").setContentText("Test alert").build();
            assertTrue(service.onNotifyNotificationWithChannel("test", 1, notification, "Raah corridor alerts"));
            android.app.NotificationManager manager = service.getSystemService(android.app.NotificationManager.class);
            assertEquals(1, manager.getActiveNotifications().length);
            String channel = manager.getActiveNotifications()[0].getNotification().getChannelId();
            assertEquals(android.app.NotificationManager.IMPORTANCE_HIGH, manager.getNotificationChannel(channel).getImportance());
            manager.cancelAll();
            shadowOf(RuntimeEnvironment.getApplication()).denyPermissions(Manifest.permission.POST_NOTIFICATIONS);
            assertFalse(service.onNotifyNotificationWithChannel("blocked", 2, notification, "Raah corridor alerts"));
            assertEquals(0, manager.getActiveNotifications().length);
        } finally { controller.destroy(); }
    }
}
