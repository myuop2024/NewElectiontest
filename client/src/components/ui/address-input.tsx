import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { hereApiService, type AddressSuggestion } from "@/lib/here-api";
import { cn } from "@/lib/utils";

interface AddressInputProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  parish?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

export function AddressInput({
  value,
  onChange,
  parish,
  placeholder = "Start typing your address...",
  required = false,
  className,
  label = "Address"
}: AddressInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        setIsLoading(true);
        try {
          const results = await hereApiService.autocompleteAddress(query, parish);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Address search error:", error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, parish]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedIndex(-1);
    onChange(newValue);
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    const fullAddress = suggestion.label;
    setQuery(fullAddress);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onChange(fullAddress, suggestion.position);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Focus management for keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest"
      });
    }
  }, [selectedIndex]);

  const formatJamaicanAddress = (suggestion: AddressSuggestion): string => {
    const parts = [];
    
    if (suggestion.address.houseNumber) {
      parts.push(suggestion.address.houseNumber);
    }
    if (suggestion.address.street) {
      parts.push(suggestion.address.street);
    }
    if (suggestion.address.district && suggestion.address.district !== suggestion.address.city) {
      parts.push(suggestion.address.district);
    }
    if (suggestion.address.city) {
      parts.push(suggestion.address.city);
    }
    
    return parts.join(", ");
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label htmlFor="address-input" className="text-sm font-medium mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding to allow click on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              ref={el => suggestionRefs.current[index] = el}
              type="button"
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0",
                selectedIndex === index && "bg-blue-50"
              )}
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {formatJamaicanAddress(suggestion)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {suggestion.address.city && suggestion.address.state && 
                      `${suggestion.address.city}, ${suggestion.address.state}`
                    }
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && query.length >= 3 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
          <div className="text-sm text-gray-500 text-center">
            No addresses found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  );
}