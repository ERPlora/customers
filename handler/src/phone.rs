//! A customer's phone, saved in E.164 (`+34600111222`) — customers#121, CUSTOMERS-F11.
//!
//! The card's phone is what the rest of the hub compares against: Appointments copies it into the
//! appointment and the «appointment confirmed» WhatsApp notice looks the conversation up with that
//! copy, and WhatsApp keys its conversations by the international number. A phone saved as typed
//! («600 111 222», «600111») either matched nobody or matched somebody else, so every write of a
//! card goes through [`to_e164`]: one canonical form, or a refusal.
//!
//! The rules are libphonenumber's (the reference the module adopted), on its own metadata
//! ([`crate::phone_metadata`], generated from it): the library itself does not fit the hub's WASM
//! sandbox (loading its metadata spends more fuel than a handler call is given).

use crate::phone_metadata::{Region, REGIONS};

/// The country a number without prefix belongs to when the hub never saved one (CUSTOMERS-F10).
pub const DEFAULT_COUNTRY: &str = "ES";

/// The typed text is not a phone number of its country.
#[derive(Debug, PartialEq, Eq)]
pub struct InvalidPhone;

/// `raw` as E.164, reading a number without prefix as one of `home_iso` (the business's country,
/// ISO 3166 alpha-2; empty or unknown → [`DEFAULT_COUNTRY`]). The empty phone stays empty: only
/// the name is required on a card.
///
/// Accepted: digits with spaces, `-`, `.`, `/` and parentheses, an optional leading `+` or the
/// international call prefix dialled from the business's country (`00` in Spain), and a national
/// trunk prefix (`07700…` in the United Kingdom, `+44 (0)7700…`). Refused: letters (an extension,
/// a note), more than one `+`, and a national number whose length is not possible for its country
/// («600111» in Spain) — that also catches two numbers typed in the same field.
pub fn to_e164(raw: &str, home_iso: &str) -> Result<String, InvalidPhone> {
    let text = raw.trim();
    if text.is_empty() {
        return Ok(String::new());
    }
    let mut digits = String::new();
    let mut plus = false;
    for c in text.chars() {
        match c {
            '0'..='9' => digits.push(c),
            '+' if !plus && digits.is_empty() => plus = true,
            ' ' | '\u{a0}' | '\t' | '-' | '.' | '/' | '(' | ')' => {}
            _ => return Err(InvalidPhone),
        }
    }
    let home = home_region(home_iso).ok_or(InvalidPhone)?;

    if plus {
        return international(&digits);
    }
    if !home.idd.is_empty() && digits.len() > home.idd.len() && digits.starts_with(home.idd) {
        return international(&digits[home.idd.len()..]);
    }
    let national = strip_trunk(&digits, home.trunk, home.code);
    if possible(home.code, national) {
        return Ok(format!("+{}{}", home.code, national));
    }
    // «34600111222» typed in Spain: the business's own calling code without its `+`.
    if let Some(rest) = digits.strip_prefix(home.code) {
        if possible(home.code, rest) {
            return Ok(format!("+{}{}", home.code, rest));
        }
    }
    Err(InvalidPhone)
}

/// The business's region; an empty or unknown code falls back to [`DEFAULT_COUNTRY`] (always in
/// the generated table — `default_country_is_in_the_table` pins it).
fn home_region(iso: &str) -> Option<&'static Region> {
    let iso = iso.trim().to_ascii_uppercase();
    REGIONS
        .iter()
        .find(|r| r.iso == iso)
        .or_else(|| REGIONS.iter().find(|r| r.iso == DEFAULT_COUNTRY))
}

/// Digits after the `+` (or after the international call prefix): calling code, then national.
fn international(digits: &str) -> Result<String, InvalidPhone> {
    // Calling codes are prefix-free (ITU-T E.164): the first 1–3 digit prefix that is one, is it.
    let code = (1..=3.min(digits.len()))
        .map(|n| &digits[..n])
        .find(|prefix| REGIONS.iter().any(|r| r.code == *prefix))
        .ok_or(InvalidPhone)?;
    let rest = &digits[code.len()..];
    // Every region of a shared calling code dials the same trunk prefix (pinned by
    // `regions_sharing_a_calling_code_share_their_trunk_prefix`).
    let trunk = REGIONS
        .iter()
        .find(|r| r.code == code)
        .map_or("", |r| r.trunk);
    let national = strip_trunk(rest, trunk, code);
    if possible(code, national) {
        Ok(format!("+{code}{national}"))
    } else {
        Err(InvalidPhone)
    }
}

/// Drops the national trunk prefix. A trunk `0` always goes: no country that dials one writes its
/// numbers with a `0` after the calling code, so what is left has to stand on its own (Italy and
/// the others that keep their `0` have no trunk prefix). Another trunk digit goes only when the
/// number is not possible with it: Russia's `8 800…` freephone, typed without its trunk, begins
/// with an `8` of its own. (Without a trunk prefix, `rest` is `digits`.)
fn strip_trunk<'a>(digits: &'a str, trunk: &str, code: &str) -> &'a str {
    match digits.strip_prefix(trunk) {
        Some(rest)
            if trunk == "0" || !possible(code, digits) =>
        {
            rest
        }
        _ => digits,
    }
}

/// Whether `national` has a length some region of `code` allows.
fn possible(code: &str, national: &str) -> bool {
    // No region has a zero length, so the empty number is never possible.
    let len = national.len();
    REGIONS
            .iter()
            .filter(|r| r.code == code)
            .any(|r| r.lengths.iter().any(|l| usize::from(*l) == len))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok(raw: &str, home: &str) -> String {
        to_e164(raw, home).unwrap_or_else(|_| panic!("{raw:?} in {home} must be valid"))
    }

    #[test]
    fn spanish_number_typed_any_way_is_one_e164() {
        for raw in [
            "600 111 222",
            "600111222",
            "600-111-222",
            "600.111.222",
            "+34 600 111 222",
            "+34600111222",
            "0034 600 111 222",
            "34600111222",
            "(+34) 600 11 12 22",
            "  600 111 222  ",
        ] {
            assert_eq!(ok(raw, "ES"), "+34600111222", "{raw:?}");
        }
    }

    #[test]
    fn empty_phone_stays_empty() {
        assert_eq!(to_e164("", "ES"), Ok(String::new()));
        assert_eq!(to_e164("   ", "ES"), Ok(String::new()));
    }

    #[test]
    fn number_too_short_or_too_long_for_its_country_is_refused() {
        assert_eq!(to_e164("600111", "ES"), Err(InvalidPhone));
        assert_eq!(to_e164("12", "ES"), Err(InvalidPhone));
        assert_eq!(to_e164("+34 600 111", "ES"), Err(InvalidPhone));
        // Two numbers in one field.
        assert_eq!(to_e164("600111222 / 611222333", "ES"), Err(InvalidPhone));
    }

    #[test]
    fn letters_extension_or_a_second_plus_are_refused() {
        assert_eq!(to_e164("600 111 222 ext 12", "ES"), Err(InvalidPhone));
        assert_eq!(to_e164("call me", "ES"), Err(InvalidPhone));
        assert_eq!(to_e164("+34 +600111222", "ES"), Err(InvalidPhone));
        assert_eq!(to_e164("600+111222", "ES"), Err(InvalidPhone));
        assert_eq!(to_e164("+", "ES"), Err(InvalidPhone));
    }

    #[test]
    fn foreign_number_keeps_its_own_country() {
        assert_eq!(ok("+33 6 12 34 56 78", "ES"), "+33612345678");
        assert_eq!(ok("0033 6 12 34 56 78", "ES"), "+33612345678");
        // Same national digits, another country: another person (CUSTOMERS-F10 step 5).
        assert_ne!(ok("+33 600 111 222", "ES"), ok("600 111 222", "ES"));
    }

    #[test]
    fn trunk_zero_is_dropped_nationally_and_inside_parentheses() {
        assert_eq!(ok("07700 900123", "GB"), "+447700900123");
        assert_eq!(ok("+44 (0)7700 900123", "ES"), "+447700900123");
        assert_eq!(ok("+44 7700 900123", "ES"), "+447700900123");
        assert_eq!(ok("06 12 34 56 78", "FR"), "+33612345678");
    }

    #[test]
    fn trunk_zero_is_dropped_even_when_the_number_would_be_possible_with_it() {
        // Germany allows 4 to 15 digits, so «0301234567» is a possible length WITH its trunk zero
        // too; libphonenumber still drops it — no German number starts with 0 after the +49.
        assert_eq!(ok("030 12345678", "DE"), "+493012345678");
        assert_eq!(ok("+49 (0)30 12345678", "ES"), "+493012345678");
    }

    #[test]
    fn a_trunk_zero_never_survives_behind_the_calling_code() {
        // «01234 5678» in the United Kingdom is 8 digits after its trunk zero: not a UK number. It
        // must be refused, not saved as «+44012345678», which no UK number looks like.
        assert_eq!(to_e164("01234 5678", "GB"), Err(InvalidPhone));
        assert_eq!(to_e164("+44 01234 5678", "ES"), Err(InvalidPhone));
    }

    #[test]
    fn a_leading_trunk_digit_stays_when_dropping_it_leaves_no_possible_number() {
        // Russian freephone typed WITHOUT the trunk «8»: its own first 8 is part of the number.
        assert_eq!(ok("800 123-45-67", "RU"), "+78001234567");
    }

    #[test]
    fn regions_sharing_a_calling_code_share_their_trunk_prefix() {
        // `international` reads the trunk of the first region with the calling code (+1 is the
        // United States, Canada and the Caribbean; +7 Russia and Kazakhstan): it is only right
        // while every region behind one code dials the same trunk prefix.
        for r in REGIONS {
            for other in REGIONS.iter().filter(|o| o.code == r.code) {
                assert_eq!(r.trunk, other.trunk, "{} and {} share +{}", r.iso, other.iso, r.code);
            }
        }
    }

    #[test]
    fn italy_keeps_its_leading_zero() {
        assert_eq!(ok("06 1234 5678", "IT"), "+390612345678");
        assert_eq!(ok("+39 06 1234 5678", "ES"), "+390612345678");
    }

    #[test]
    fn international_prefix_of_the_business_country_is_read() {
        // From the United States, `011` is the international prefix.
        assert_eq!(ok("011 34 600 111 222", "US"), "+34600111222");
        assert_eq!(ok("(212) 555-0123", "US"), "+12125550123");
        assert_eq!(ok("1 212 555 0123", "US"), "+12125550123");
    }

    #[test]
    fn the_national_reading_wins_over_the_own_calling_code_without_plus() {
        // Germany allows 4 to 15 digits: «4930 123456» is possible as it stands AND as «49» +
        // «30123456». Read nationally first, as `010_phone_e164.sql` does for the existing cards.
        assert_eq!(ok("4930 123456", "DE"), "+494930123456");
    }

    #[test]
    fn russian_freephone_keeps_its_eight() {
        // `8` is Russia's trunk prefix AND the first digit of its freephone numbers.
        assert_eq!(ok("+7 800 123 45 67", "ES"), "+78001234567");
        assert_eq!(ok("8 912 345 67 89", "RU"), "+79123456789");
    }

    #[test]
    fn unknown_or_empty_business_country_reads_as_spain() {
        assert_eq!(ok("600 111 222", ""), "+34600111222");
        assert_eq!(ok("600 111 222", "es"), "+34600111222");
        assert_eq!(ok("600 111 222", "XX"), "+34600111222");
    }

    #[test]
    fn default_country_is_in_the_table() {
        assert!(REGIONS.iter().any(|r| r.iso == DEFAULT_COUNTRY));
    }

    #[test]
    fn unknown_calling_code_is_refused() {
        // +999 is not assigned.
        assert_eq!(to_e164("+999 123 456 789", "ES"), Err(InvalidPhone));
    }
}
