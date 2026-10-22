package com.raahat.web;

import com.google.androidbrowserhelper.trusted.DelegationService;
import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.NotificationManagerCompat;
import java.util.Locale;

/** Lets the verified browser request Android location and notification permissions. */
public final class RaahatBrowserService extends DelegationService {
    public RaahatBrowserService() {
        registerExtraCommandHandler(new LocationDelegationExtraCommandHandler());
    }

    @Override public boolean onNotifyNotificationWithChannel(String tag, int id,
            Notification notification, String channelName) {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return false;
        NotificationManager manager = getSystemService(NotificationManager.class);
        Notification.Builder builder = Notification.Builder.recoverBuilder(this, notification)
                .setSmallIcon(R.drawable.ic_notification);
        if (Build.VERSION.SDK_INT >= 26) {
            // Match AndroidX's channel identity so browser permission checks see the same channel.
            String channelId = channelName.toLowerCase(Locale.ROOT).replace(' ', '_') + "_channel_id";
            NotificationChannel channel = manager.getNotificationChannel(channelId);
            if (channel == null) {
                channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH);
                channel.enableVibration(true);
                manager.createNotificationChannel(channel);
            }
            // Preserve the user's existing channel preferences, including muted/blocked channels.
            if (channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
            builder.setChannelId(channelId);
        } else builder.setPriority(Notification.PRIORITY_HIGH);
        try { manager.notify(tag, id, builder.build()); return true; }
        catch (SecurityException denied) { return false; }
    }
}
