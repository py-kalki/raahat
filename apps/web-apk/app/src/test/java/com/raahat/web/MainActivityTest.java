package com.raahat.web;

import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import android.view.ViewGroup;
import android.widget.TextView;
import org.junit.Test;
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
}
