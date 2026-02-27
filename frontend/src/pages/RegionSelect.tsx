import { TabName } from '../App';

interface RegionSelectProps {
  selectCountry: (country: string) => void;
  setActiveTab: (tab: TabName) => void;
}

const EU_COUNTRIES = [
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
];

const UK_REGION = { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' };

export default function RegionSelect({ selectCountry }: RegionSelectProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* No back button on first screen */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Select Your Region</h1>
        <p className="text-muted-foreground">
          Choose the seller's country to calculate the correct VAT rates and generate compliant invoices.
        </p>
      </div>

      {/* EU Countries */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">🇪🇺</span> European Union
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {EU_COUNTRIES.map((country) => (
            <button
              key={country.code}
              onClick={() => selectCountry(country.code)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary transition-all duration-200 group"
            >
              <span className="text-3xl">{country.flag}</span>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {country.name}
              </span>
              <span className="text-xs text-muted-foreground">{country.code}</span>
            </button>
          ))}
        </div>
      </section>

      {/* UK */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">🇬🇧</span> United Kingdom
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <button
            onClick={() => selectCountry(UK_REGION.code)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary transition-all duration-200 group"
          >
            <span className="text-3xl">{UK_REGION.flag}</span>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {UK_REGION.name}
            </span>
            <span className="text-xs text-muted-foreground">{UK_REGION.code}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
