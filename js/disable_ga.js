var GA = {
  switch: function() {
    console.log('aaa');
    var cookie = CookieStore.get("disable_ga");
    if (cookie === "true") {
      CookieStore.destroy("disable_ga");
      alert("Google Analytics enabled");
    } else {
      CookieStore.set("disable_ga", "true");
      alert("Google Analytics disabled");
    }
  }
};
