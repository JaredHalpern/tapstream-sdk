using System;
using System.Collections.Generic;
using System.Linq;
using Foundation;
using UIKit;

using TapstreamMetrics;

namespace XamariniOS
{
	// The UIApplicationDelegate for the application. This class is responsible for launching the 
	// User Interface of the application, as well as listening (and optionally responding) to 
	// application events from iOS.
	[Register ("AppDelegate")]
	public partial class AppDelegate : UIApplicationDelegate
	{
		// class-level declarations
		UIWindow window;
		XamariniOSViewController viewController;
		//
		// This method is invoked when the application has loaded and is ready to run. In this 
		// method you should instantiate the window, load the UI into it and then make the window
		// visible.
		//
		// You have 17 seconds to return from this method, or iOS will terminate your application.
		//
		public override bool FinishedLaunching (UIApplication app, NSDictionary options)
		{
			window = new UIWindow (UIScreen.MainScreen.Bounds);
			
			viewController = new XamariniOSViewController ();
			window.RootViewController = viewController;
			window.MakeKeyAndVisible ();

			Config conf = new Config();
			conf.Set("fireAutomaticInstallEvent", false);
			conf.Set("openEventName", "xamarin open");
			Tapstream.Create("sdktest", "YGP2pezGTI6ec48uti4o1w", conf);

			Event e = new Event("test-event", false);
			e.AddPair("level", 5);
			e.AddPair("name", "john doe");
			e.AddPair ("score", 10.6);
			Tapstream.FireEvent(e);


			return true;
		}
	}
}

