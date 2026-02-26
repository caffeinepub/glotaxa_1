import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Principal "mo:core/Principal";

actor {
  // VAT rates persistent store
  let vatRates = Map.empty<Nat, Float>();

  // Owners persistent store
  let owners = Set.empty<Principal>();

  // API keys persistent store
  let apiKeys = Set.empty<Text>();

  // Add owner
  public shared ({ caller }) func addOwner(newOwner : Principal) : async Bool {
    if (owners.isEmpty()) {
      owners.add(newOwner);
      true;
    } else if (owners.contains(caller)) {
      owners.add(newOwner);
      true;
    } else {
      false;
    };
  };

  // Pay VAT
  public shared ({ caller }) func payVat(amount : Float, vatKey : Nat) : async Float {
    switch (vatRates.get(vatKey)) {
      case (?vatRate) {
        amount * vatRate;
      };
      case (null) { 0.0 };
    };
  };

  // Add/Update VAT range
  public shared ({ caller }) func upsertVat(key : Nat, rate : Float) : async Bool {
    if (owners.contains(caller)) {
      vatRates.add(key, rate);
      true;
    } else {
      false;
    };
  };

  // List range
  public shared ({ caller }) func listVatRates() : async [(Nat, Float)] {
    vatRates.toArray();
  };

  // Add API key
  public shared ({ caller }) func addApiKey(apiKey : Text) : async Bool {
    if (owners.contains(caller)) {
      apiKeys.add(apiKey);
      true;
    } else {
      false;
    };
  };

  // Remove API key
  public shared ({ caller }) func removeApiKey(apiKey : Text) : async Bool {
    if (owners.contains(caller)) {
      apiKeys.remove(apiKey);
      true;
    } else {
      false;
    };
  };

  // Check API key
  public shared ({ caller }) func checkApiKey(apiKey : Text) : async Bool {
    apiKeys.contains(apiKey);
  };
};
