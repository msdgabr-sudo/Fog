package com.qiblalabs.nativebridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import com.qiblalabs.R;

/**
 * Plays one bundled Adhan from a visible media-playback foreground service.
 * The service never downloads audio and never records or reads the microphone.
 */
public final class AdhanPlaybackService extends Service
        implements AudioManager.OnAudioFocusChangeListener,
        MediaPlayer.OnCompletionListener,
        MediaPlayer.OnErrorListener {

    public static final String ACTION_PLAY = "com.qiblalabs.action.PLAY_ADHAN";
    public static final String ACTION_STOP = "com.qiblalabs.action.STOP_ADHAN";
    public static final String EXTRA_PRAYER = "prayer";
    private static final String CHANNEL_ID = "qiblaastro_adhan_playback_v2";
    private static final int NOTIFICATION_ID = 8610;

    private MediaPlayer player;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private MediaSession mediaSession;
    private boolean hasAudioFocus;
    private boolean prepared;
    private boolean resumeOnFocusGain;

    @Override public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        mediaSession = new MediaSession(this, "QiblaAstroAdhan");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onStop() { stopPlaybackAndSelf(); }
            @Override public void onPause() { pauseForFocusLoss(); }
            @Override public void onPlay() {
                if (prepared && player != null && !safeIsPlaying()) {
                    try {
                        player.start();
                        publishPlaybackState(PlaybackState.STATE_PLAYING);
                    } catch (IllegalStateException ignored) {}
                }
            }
        });
        mediaSession.setActive(true);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopPlaybackAndSelf();
            return START_NOT_STICKY;
        }
        if (!ACTION_PLAY.equals(intent.getAction())) {
            stopPlaybackAndSelf();
            return START_NOT_STICKY;
        }

        String prayerId = sanitizePrayer(intent.getStringExtra(EXTRA_PRAYER));
        if (prayerId.isEmpty()) {
            stopPlaybackAndSelf();
            return START_NOT_STICKY;
        }
        SharedPreferences prefs = getSharedPreferences(PrayerNativeScheduler.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("enabled", false)
                || !"adhan".equals(prefs.getString("mode_" + prayerId, "off"))) {
            stopPlaybackAndSelf();
            return START_NOT_STICKY;
        }

        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification(prayerId));
        startBundledAdhan(prayerId, prefs.getString("profile", "makkah"));
        return START_NOT_STICKY;
    }

    private void startBundledAdhan(String prayerId, String profile) {
        releasePlayer();
        abandonAudioFocus();
        if (!requestAudioFocus()) {
            stopPlaybackAndSelf();
            return;
        }
        int rawId = rawForAdhan(prayerId, profile);
        if (rawId == 0) {
            stopPlaybackAndSelf();
            return;
        }
        AssetFileDescriptor afd = null;
        try {
            afd = getResources().openRawResourceFd(rawId);
            if (afd == null) throw new IllegalStateException("Adhan resource is compressed or missing");
            MediaPlayer next = new MediaPlayer();
            next.setAudioAttributes(alarmAttributes());
            next.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
            next.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            next.setOnCompletionListener(this);
            next.setOnErrorListener(this);
            next.setOnPreparedListener(mp -> {
                if (mp != player) return;
                prepared = true;
                try {
                    mp.start();
                    publishPlaybackState(PlaybackState.STATE_PLAYING);
                } catch (IllegalStateException ignored) { stopPlaybackAndSelf(); }
            });
            player = next;
            publishPlaybackState(PlaybackState.STATE_BUFFERING);
            next.prepareAsync();
        } catch (Exception ignored) {
            stopPlaybackAndSelf();
        } finally {
            if (afd != null) {
                try { afd.close(); } catch (Exception ignored) {}
            }
        }
    }

    private AudioAttributes alarmAttributes() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return false;
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                    .setAudioAttributes(alarmAttributes())
                    .setWillPauseWhenDucked(true)
                    .setOnAudioFocusChangeListener(this)
                    .build();
            result = audioManager.requestAudioFocus(focusRequest);
        } else {
            result = audioManager.requestAudioFocus(
                    this, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
        }
        hasAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        return hasAudioFocus;
    }

    @Override public void onAudioFocusChange(int change) {
        if (change == AudioManager.AUDIOFOCUS_GAIN) {
            if (resumeOnFocusGain && prepared && player != null && !safeIsPlaying()) {
                try {
                    player.start();
                    publishPlaybackState(PlaybackState.STATE_PLAYING);
                } catch (IllegalStateException ignored) { stopPlaybackAndSelf(); }
            }
            resumeOnFocusGain = false;
            return;
        }
        if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
                || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            pauseForFocusLoss();
            return;
        }
        if (change == AudioManager.AUDIOFOCUS_LOSS) stopPlaybackAndSelf();
    }

    private void pauseForFocusLoss() {
        if (prepared && player != null && safeIsPlaying()) {
            try {
                player.pause();
                resumeOnFocusGain = true;
                publishPlaybackState(PlaybackState.STATE_PAUSED);
            } catch (IllegalStateException ignored) { stopPlaybackAndSelf(); }
        }
    }

    private boolean safeIsPlaying() {
        try { return player != null && player.isPlaying(); }
        catch (IllegalStateException ignored) { return false; }
    }

    private Notification buildNotification(String prayerId) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(
                this, 8611, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stopIntent = new Intent(this, AdhanPlaybackService.class).setAction(ACTION_STOP);
        PendingIntent stop = PendingIntent.getService(
                this, 8612, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String prayerName = PrayerNotificationReceiver.prayerName(this, prayerId);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(getString(R.string.prayer_notification_title))
                .setContentText(getString(R.string.prayer_notification_now, prayerName))
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .addAction(getApplicationInfo().icon, getString(R.string.prayer_playback_stop), stop);
        if (open != null) builder.setContentIntent(open);
        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                getString(R.string.prayer_channel_adhan),
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(getString(R.string.prayer_channel_description));
        channel.setSound(null, null);
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);
    }

    private int rawForAdhan(String prayerId, String profile) {
        if ("fajr".equals(prayerId)) return R.raw.adhan_fajr;
        if ("calm".equals(profile)) return R.raw.adhan_ahmed_al_nufais;
        if ("deep".equals(profile)) return R.raw.adhan_islam_sobhi;
        return R.raw.adhan_mecca;
    }

    private String sanitizePrayer(String id) {
        for (String allowed : PrayerNativeScheduler.IDS) if (allowed.equals(id)) return allowed;
        return "";
    }

    private void publishPlaybackState(int state) {
        if (mediaSession == null) return;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP)
                .setState(state, PlaybackState.PLAYBACK_POSITION_UNKNOWN, state == PlaybackState.STATE_PLAYING ? 1f : 0f)
                .build());
    }

    @Override public void onCompletion(MediaPlayer mp) { stopPlaybackAndSelf(); }

    @Override public boolean onError(MediaPlayer mp, int what, int extra) {
        stopPlaybackAndSelf();
        return true;
    }

    private void abandonAudioFocus() {
        if (!hasAudioFocus || audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            audioManager.abandonAudioFocus(this);
        }
        hasAudioFocus = false;
        focusRequest = null;
    }

    private void releasePlayer() {
        prepared = false;
        if (player == null) return;
        try { player.setOnCompletionListener(null); } catch (Exception ignored) {}
        try { player.setOnErrorListener(null); } catch (Exception ignored) {}
        try { player.stop(); } catch (Exception ignored) {}
        try { player.release(); } catch (Exception ignored) {}
        player = null;
    }

    private void stopPlaybackAndSelf() {
        resumeOnFocusGain = false;
        releasePlayer();
        abandonAudioFocus();
        publishPlaybackState(PlaybackState.STATE_STOPPED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        stopSelf();
    }

    @Override public void onDestroy() {
        releasePlayer();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
