import { VAT_RULES, type CountryCode } from '../data/vatRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RegionSelectProps {
  selectCountry: (country: CountryCode) => void;
}

export function RegionSelect({ selectCountry }: RegionSelectProps) {
  const euCountries: CountryCode[] = [
    "DE",
    "FR",
    "NL",
    "PL",
    "SE",
    "IT",
    "BE",
    "AT",
    "HU",
    "ES"
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Select Your Country</h2>
        <p className="text-muted-foreground">Choose the country for VAT calculation</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* EU Region */}
        <Card>
          <CardHeader>
            <CardTitle>EU Region</CardTitle>
            <CardDescription>European Union member states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {euCountries.map((code) => (
                <Button
                  key={code}
                  onClick={() => selectCountry(code)}
                  variant="outline"
                  className="justify-start"
                >
                  {VAT_RULES[code].name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* UK Region */}
        <Card>
          <CardHeader>
            <CardTitle>UK</CardTitle>
            <CardDescription>United Kingdom</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => selectCountry("GB")}
              variant="outline"
              className="w-full justify-start"
            >
              {VAT_RULES.GB.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
