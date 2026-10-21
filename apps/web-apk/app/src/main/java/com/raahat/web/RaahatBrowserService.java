package com.raahat.web;

import com.google.androidbrowserhelper.trusted.DelegationService;
import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;

/** Lets the verified browser request Android location and notification permissions. */
public final class RaahatBrowserService extends DelegationService {
    public RaahatBrowserService() {
        registerExtraCommandHandler(new LocationDelegationExtraCommandHandler());
    }
}
