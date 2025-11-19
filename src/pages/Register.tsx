import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import axios from "axios";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { City, Country, State } from "country-state-city";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type SearchableSelectOption = {
  label: string;
  value: string;
};

interface SearchableSelectProps {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  emptyMessage: string;
  searchPlaceholder?: string;
  onChange: (option: SearchableSelectOption | null) => void;
  allowClear?: boolean;
  disabled?: boolean;
}

function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  emptyMessage,
  searchPlaceholder,
  onChange,
  allowClear = false,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="flex-1 truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder ?? placeholder}
            className="h-9"
          />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {allowClear && value ? (
                <CommandItem
                  value="clear-selection"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </CommandItem>
              ) : null}
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { walletAddress, token } = useAppStore();

  const [registerForOther, setRegisterForOther] = useState(false);
  const [otherPublicKey, setOtherPublicKey] = useState("");

  const [form, setForm] = useState({
    type: "MANUFACTURER",
    legalName: "",
    businessRegNo: "",
    countryOfIncorporation: "",
    personName: "",
    designation: "",
    email: "",
    phone: "",
    address: "",
    dateOfRegistration: "",
    // Manufacturer
    productCategoriesManufactured: "",
    certifications: "",
    // Supplier / Consumer
    productCategoriesSupplied: "",
    sourceRegions: "",
    notes: "",
    // Warehouse
    officeAddress: "",
    // Checkpoint
    checkpointName: "",
    checkpointAddress: "",
    checkpointLatitude: "",
    checkpointLongitude: "",
    checkpointState: "",
    checkpointCountry: "",
    checkpointCity: "",
  });

  const requiresCheckpoint =
    form.type === "MANUFACTURER" || form.type === "WAREHOUSE";
  const showCheckpointSection = requiresCheckpoint || form.type === "CONSUMER";

  const countryOptions = useMemo(() => {
    const countries = Country.getAllCountries();
    return countries
      .map((country) => ({
        value: country.isoCode,
        label: country.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const selectedCheckpointCountry = useMemo(
    () =>
      countryOptions.find(
        (option) => option.value === form.checkpointCountry
      ) ?? null,
    [countryOptions, form.checkpointCountry]
  );

  const checkpointStateOptions = useMemo(() => {
    if (!selectedCheckpointCountry) {
      return [];
    }

    return State.getStatesOfCountry(selectedCheckpointCountry.value)
      .map((state) => ({
        value: state.isoCode,
        label: state.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCheckpointCountry]);

  const selectedCheckpointState = useMemo(
    () =>
      checkpointStateOptions.find(
        (option) => option.value === form.checkpointState
      ) ?? null,
    [checkpointStateOptions, form.checkpointState]
  );

  const checkpointCityOptions = useMemo(() => {
    if (!selectedCheckpointCountry || !selectedCheckpointState) {
      return [];
    }

    return City.getCitiesOfState(
      selectedCheckpointCountry.value,
      selectedCheckpointState.value
    )
      .map((city) => ({
        value: city.name,
        label: city.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCheckpointCountry, selectedCheckpointState]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCountryOfIncorporationSelect = (
    option: SearchableSelectOption | null
  ) => {
    setForm((prev) => ({
      ...prev,
      countryOfIncorporation: option?.value ?? "",
    }));
  };

  const handleCheckpointCountrySelect = (
    option: SearchableSelectOption | null
  ) => {
    setForm((prev) => ({
      ...prev,
      checkpointCountry: option?.value ?? "",
      checkpointState: "",
      checkpointCity: "",
    }));
  };

  const handleCheckpointStateSelect = (
    option: SearchableSelectOption | null
  ) => {
    setForm((prev) => ({
      ...prev,
      checkpointState: option?.value ?? "",
      checkpointCity: "",
    }));
  };

  const handleCheckpointCitySelect = (
    option: SearchableSelectOption | null
  ) => {
    setForm((prev) => ({
      ...prev,
      checkpointCity: option?.value ?? "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      toast.error("Please connect your wallet before registration.");
      return;
    }

    const targetPublicKey = registerForOther
      ? otherPublicKey.trim()
      : walletAddress;

    if (registerForOther && !otherPublicKey.trim()) {
      toast.error("Please provide a public key for the other wallet.");
      return;
    }

    if (!form.email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!form.countryOfIncorporation) {
      toast.error("Please select a country of incorporation.");
      return;
    }

    if (form.countryOfIncorporation.length < 2) {
      toast.error("Country code must be at least 2 characters (e.g., US).");
      return;
    }

    if (requiresCheckpoint && !form.checkpointCountry) {
      toast.error("Please select a checkpoint country.");
      return;
    }

    if (
      requiresCheckpoint &&
      checkpointStateOptions.length > 0 &&
      !form.checkpointState
    ) {
      toast.error("Please select a checkpoint state or province.");
      return;
    }

    try {
      setLoading(true);

      const uppercaseCountry = form.countryOfIncorporation.trim().toUpperCase();
      const splitAndTrim = (value: string) =>
        value
          ? value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
          : [];

      // Build details object based on organization type
      let details: Record<string, unknown> = {};

      if (form.type === "MANUFACTURER") {
        const productCategoriesManufactured = splitAndTrim(
          form.productCategoriesManufactured
        );
        const certifications = splitAndTrim(form.certifications);

        if (productCategoriesManufactured.length) {
          details.productCategoriesManufactured = productCategoriesManufactured;
        }
        if (certifications.length) {
          details.certifications = certifications;
        }
      } else if (["SUPPLIER", "CONSUMER"].includes(form.type)) {
        const productCategoriesSupplied = splitAndTrim(
          form.productCategoriesSupplied
        );
        const sourceRegions = splitAndTrim(form.sourceRegions).map((region) =>
          region.toUpperCase()
        );
        const notes = form.notes.trim();

        if (productCategoriesSupplied.length) {
          details.productCategoriesSupplied = productCategoriesSupplied;
        }
        if (sourceRegions.length) {
          details.sourceRegions = sourceRegions;
        }
        if (notes) {
          details.notes = notes;
        }
      } else if (form.type === "WAREHOUSE") {
        details = {
          officeAddress: form.officeAddress,
          countryOfIncorporation: uppercaseCountry,
        };
      }

      const checkpointCountryName = (
        selectedCheckpointCountry?.label ?? form.checkpointCountry
      ).trim();
      const checkpointStateName = (
        selectedCheckpointState?.label ?? form.checkpointState
      ).trim();
      const checkpointCityName = form.checkpointCity.trim();

      const checkpoint: Record<string, string> = {
        name: form.checkpointName.trim(),
        address: form.checkpointAddress.trim(),
        latitude: form.checkpointLatitude.trim(),
        longitude: form.checkpointLongitude.trim(),
        state: checkpointStateName,
        country: checkpointCountryName,
      };

      if (checkpointCityName) {
        checkpoint.city = checkpointCityName;
      }

      const hasCheckpointData = Object.values(checkpoint).some(
        (value) => value.length > 0
      );

      const payload = {
        type: form.type,
        identification: {
          publicKey: targetPublicKey,
          legalName: form.legalName,
          businessRegNo: form.businessRegNo,
          countryOfIncorporation: uppercaseCountry,
        },
        contact: {
          personName: form.personName,
          designation: form.designation,
          email: form.email.trim(),
          phone: form.phone,
          address: form.address,
        },
        metadata: {
          publicKey: targetPublicKey,
          smartContractRole: form.type,
          dateOfRegistration:
            form.dateOfRegistration || new Date().toISOString().split("T")[0],
        },
        details,
        ...(hasCheckpointData ? { checkpoint } : {}),
      };

      console.log("Registration payload:", payload);

      const response = await api.post("/api/registrations", payload);

      if (response.status === 200 || response.status === 201) {
        toast.success("Registration successful!");
        navigate("/");
      } else {
        toast.error("Unexpected server response.");
      }
    } catch (error) {
      console.error(error);

      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Registration failed.";

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Organization Registration
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Organization Type</Label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="border rounded-md p-2 bg-card"
              >
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="CONSUMER">Consumer</option>
              </select>
            </div>

            {/* Register for other wallet */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="registerForOther"
                checked={registerForOther}
                onChange={(e) => setRegisterForOther(e.target.checked)}
              />
              <Label htmlFor="registerForOther">
                Register for another wallet
              </Label>
            </div>

            {registerForOther && (
              <div className="mt-2">
                <Label htmlFor="otherPublicKey">Other Wallet Public Key</Label>
                <Input
                  id="otherPublicKey"
                  name="otherPublicKey"
                  value={otherPublicKey}
                  onChange={(e) => setOtherPublicKey(e.target.value)}
                  placeholder="0x1234...abcd"
                  required={registerForOther}
                />
              </div>
            )}

            {/* Identification */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  name="legalName"
                  value={form.legalName}
                  onChange={handleChange}
                  placeholder="Organization Legal Name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="businessRegNo">Business Reg. No</Label>
                <Input
                  id="businessRegNo"
                  name="businessRegNo"
                  value={form.businessRegNo}
                  onChange={handleChange}
                  placeholder="REG-12345"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="countryOfIncorporation">
                  Country of Incorporation
                </Label>
                <SearchableSelect
                  id="countryOfIncorporation"
                  value={form.countryOfIncorporation}
                  options={countryOptions}
                  placeholder="Select country"
                  emptyMessage="No country found."
                  searchPlaceholder="Search country..."
                  onChange={handleCountryOfIncorporationSelect}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="info@organization.example"
                  required
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="personName">Contact Person</Label>
                <Input
                  id="personName"
                  name="personName"
                  value={form.personName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="Operations Manager"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1-555-123-0000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="200 Logistics Way, Oakland, CA"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dateOfRegistration">Date of Registration</Label>
              <Input
                id="dateOfRegistration"
                name="dateOfRegistration"
                type="date"
                value={form.dateOfRegistration}
                onChange={handleChange}
              />
            </div>

            {/* Checkpoint Details */}
            {showCheckpointSection && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkpointName">Checkpoint Name</Label>
                    <Input
                      id="checkpointName"
                      name="checkpointName"
                      value={form.checkpointName}
                      onChange={handleChange}
                      placeholder="Colombo Port Warehouse"
                      required={requiresCheckpoint}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkpointAddress">Checkpoint Address</Label>
                    <Input
                      id="checkpointAddress"
                      name="checkpointAddress"
                      value={form.checkpointAddress}
                      onChange={handleChange}
                      placeholder="Dockyard Road, Colombo 01"
                      required={requiresCheckpoint}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkpointLatitude">Latitude</Label>
                    <Input
                      id="checkpointLatitude"
                      name="checkpointLatitude"
                      value={form.checkpointLatitude}
                      onChange={handleChange}
                      placeholder="6.9370"
                      required={requiresCheckpoint}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkpointLongitude">Longitude</Label>
                    <Input
                      id="checkpointLongitude"
                      name="checkpointLongitude"
                      value={form.checkpointLongitude}
                      onChange={handleChange}
                      placeholder="79.8500"
                      required={requiresCheckpoint}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkpointCountry">Country</Label>
                    <SearchableSelect
                      id="checkpointCountry"
                      value={form.checkpointCountry}
                      options={countryOptions}
                      placeholder="Select country"
                      emptyMessage="No country found."
                      searchPlaceholder="Search country..."
                      allowClear={!requiresCheckpoint}
                      onChange={handleCheckpointCountrySelect}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkpointState">State / Province</Label>
                    {form.checkpointCountry ? (
                      checkpointStateOptions.length > 0 ? (
                        <SearchableSelect
                          id="checkpointState"
                          value={form.checkpointState}
                          options={checkpointStateOptions}
                          placeholder="Select state / province"
                          emptyMessage="No state found."
                          searchPlaceholder="Search state..."
                          allowClear={!requiresCheckpoint}
                          onChange={handleCheckpointStateSelect}
                        />
                      ) : (
                        <Input
                          id="checkpointState"
                          name="checkpointState"
                          value={form.checkpointState}
                          onChange={handleChange}
                          placeholder="Western Province"
                          required={requiresCheckpoint}
                        />
                      )
                    ) : (
                      <SearchableSelect
                        id="checkpointState"
                        value=""
                        options={[]}
                        placeholder="Select a country first"
                        emptyMessage="Select a country to view states."
                        searchPlaceholder="Search state..."
                        disabled
                        onChange={() => undefined}
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="checkpointCity">City</Label>
                    {form.checkpointCountry && form.checkpointState ? (
                      checkpointCityOptions.length > 0 ? (
                        <SearchableSelect
                          id="checkpointCity"
                          value={form.checkpointCity}
                          options={checkpointCityOptions}
                          placeholder="Select city"
                          emptyMessage="No city found."
                          searchPlaceholder="Search city..."
                          allowClear
                          onChange={handleCheckpointCitySelect}
                        />
                      ) : (
                        <Input
                          id="checkpointCity"
                          name="checkpointCity"
                          value={form.checkpointCity}
                          onChange={handleChange}
                          placeholder="Sacramento"
                        />
                      )
                    ) : (
                      <SearchableSelect
                        id="checkpointCity"
                        value=""
                        options={[]}
                        placeholder="Select a state first"
                        emptyMessage="Select a state to view cities."
                        searchPlaceholder="Search city..."
                        disabled
                        onChange={() => undefined}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manufacturer Fields */}
            {form.type === "MANUFACTURER" && (
              <>
                <div>
                  <Label htmlFor="productCategoriesManufactured">
                    Product Categories (comma separated)
                  </Label>
                  <Input
                    id="productCategoriesManufactured"
                    name="productCategoriesManufactured"
                    value={form.productCategoriesManufactured}
                    onChange={handleChange}
                    placeholder="Widgets, Gadgets"
                  />
                </div>
                <div>
                  <Label htmlFor="certifications">
                    Certifications (comma separated)
                  </Label>
                  <Input
                    id="certifications"
                    name="certifications"
                    value={form.certifications}
                    onChange={handleChange}
                    placeholder="ISO9001"
                  />
                </div>
              </>
            )}

            {/* Supplier / Consumer Fields */}
            {["SUPPLIER", "CONSUMER"].includes(form.type) && (
              <>
                <div>
                  <Label htmlFor="productCategoriesSupplied">
                    Product Categories (comma separated)
                  </Label>
                  <Input
                    id="productCategoriesSupplied"
                    name="productCategoriesSupplied"
                    value={form.productCategoriesSupplied}
                    onChange={handleChange}
                    placeholder="Steel, Aluminum"
                  />
                </div>
                <div>
                  <Label htmlFor="sourceRegions">
                    Source Regions (comma separated country codes)
                  </Label>
                  <Input
                    id="sourceRegions"
                    name="sourceRegions"
                    value={form.sourceRegions}
                    onChange={handleChange}
                    placeholder="CN, MY"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Regional distribution hub onboarding"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Warehouse Fields */}
            {form.type === "WAREHOUSE" && (
              <div>
                <Label htmlFor="officeAddress">Office Address</Label>
                <Input
                  id="officeAddress"
                  name="officeAddress"
                  value={form.officeAddress}
                  onChange={handleChange}
                  placeholder="200 Logistics Way, Oakland, CA"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

