<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $enabled = ['AUD', 'CAD', 'EUR', 'GBP', 'JPY', 'RUB', 'UAH', 'USD', 'VND'];
        $catalogue = [
            ['AED', 'UAE Dirham', 'د.إ', 2], ['AFN', 'Afghani', '؋', 2], ['ALL', 'Lek', 'L', 2],
            ['AMD', 'Armenian Dram', '֏', 2], ['ANG', 'Netherlands Antillean Guilder', 'ƒ', 2], ['AOA', 'Kwanza', 'Kz', 2],
            ['ARS', 'Argentine Peso', '$', 2], ['AUD', 'Australian Dollar', '$', 2], ['AWG', 'Aruban Florin', 'ƒ', 2],
            ['AZN', 'Azerbaijan Manat', '₼', 2], ['BAM', 'Convertible Mark', 'KM', 2], ['BBD', 'Barbados Dollar', '$', 2],
            ['BDT', 'Taka', '৳', 2], ['BGN', 'Bulgarian Lev', 'лв', 2], ['BHD', 'Bahraini Dinar', 'د.ب', 3],
            ['BIF', 'Burundi Franc', 'FBu', 0], ['BMD', 'Bermudian Dollar', '$', 2], ['BND', 'Brunei Dollar', '$', 2],
            ['BOB', 'Boliviano', 'Bs.', 2], ['BRL', 'Brazilian Real', 'R$', 2], ['BSD', 'Bahamian Dollar', '$', 2],
            ['BTN', 'Ngultrum', 'Nu.', 2], ['BWP', 'Pula', 'P', 2], ['BYN', 'Belarusian Ruble', 'Br', 2],
            ['BZD', 'Belize Dollar', '$', 2], ['CAD', 'Canadian Dollar', '$', 2], ['CDF', 'Congolese Franc', 'FC', 2],
            ['CHF', 'Swiss Franc', 'CHF', 2], ['CLP', 'Chilean Peso', '$', 0], ['CNY', 'Yuan Renminbi', '¥', 2],
            ['COP', 'Colombian Peso', '$', 2], ['CRC', 'Costa Rican Colón', '₡', 2], ['CUP', 'Cuban Peso', '$', 2],
            ['CVE', 'Cabo Verde Escudo', '$', 2], ['CZK', 'Czech Koruna', 'Kč', 2], ['DJF', 'Djibouti Franc', 'Fdj', 0],
            ['DKK', 'Danish Krone', 'kr', 2], ['DOP', 'Dominican Peso', '$', 2], ['DZD', 'Algerian Dinar', 'د.ج', 2],
            ['EGP', 'Egyptian Pound', '£', 2], ['ERN', 'Nakfa', 'Nfk', 2], ['ETB', 'Ethiopian Birr', 'Br', 2],
            ['EUR', 'Euro', '€', 2], ['FJD', 'Fiji Dollar', '$', 2], ['FKP', 'Falkland Islands Pound', '£', 2],
            ['GBP', 'Pound Sterling', '£', 2], ['GEL', 'Lari', '₾', 2], ['GHS', 'Ghana Cedi', '₵', 2],
            ['GIP', 'Gibraltar Pound', '£', 2], ['GMD', 'Dalasi', 'D', 2], ['GNF', 'Guinean Franc', 'FG', 0],
            ['GTQ', 'Quetzal', 'Q', 2], ['GYD', 'Guyana Dollar', '$', 2], ['HKD', 'Hong Kong Dollar', '$', 2],
            ['HNL', 'Lempira', 'L', 2], ['HTG', 'Gourde', 'G', 2], ['HUF', 'Forint', 'Ft', 2],
            ['IDR', 'Rupiah', 'Rp', 2], ['ILS', 'New Israeli Sheqel', '₪', 2], ['INR', 'Indian Rupee', '₹', 2],
            ['IQD', 'Iraqi Dinar', 'ع.د', 3], ['IRR', 'Iranian Rial', '﷼', 2], ['ISK', 'Iceland Krona', 'kr', 0],
            ['JMD', 'Jamaican Dollar', '$', 2], ['JOD', 'Jordanian Dinar', 'د.ا', 3], ['JPY', 'Yen', '¥', 0],
            ['KES', 'Kenyan Shilling', 'KSh', 2], ['KGS', 'Som', 'с', 2], ['KHR', 'Riel', '៛', 2],
            ['KMF', 'Comorian Franc', 'CF', 0], ['KPW', 'North Korean Won', '₩', 2], ['KRW', 'Won', '₩', 0],
            ['KWD', 'Kuwaiti Dinar', 'د.ك', 3], ['KYD', 'Cayman Islands Dollar', '$', 2], ['KZT', 'Tenge', '₸', 2],
            ['LAK', 'Lao Kip', '₭', 2], ['LBP', 'Lebanese Pound', 'ل.ل', 2], ['LKR', 'Sri Lanka Rupee', 'Rs', 2],
            ['LRD', 'Liberian Dollar', '$', 2], ['LSL', 'Loti', 'L', 2], ['LYD', 'Libyan Dinar', 'ل.د', 3],
            ['MAD', 'Moroccan Dirham', 'د.م.', 2], ['MDL', 'Moldovan Leu', 'L', 2], ['MGA', 'Malagasy Ariary', 'Ar', 2],
            ['MKD', 'Denar', 'ден', 2], ['MMK', 'Kyat', 'K', 2], ['MNT', 'Tugrik', '₮', 2],
            ['MOP', 'Pataca', 'MOP$', 2], ['MRU', 'Ouguiya', 'UM', 2], ['MUR', 'Mauritius Rupee', '₨', 2],
            ['MVR', 'Rufiyaa', 'Rf', 2], ['MWK', 'Malawi Kwacha', 'MK', 2], ['MXN', 'Mexican Peso', '$', 2],
            ['MYR', 'Malaysian Ringgit', 'RM', 2], ['MZN', 'Mozambique Metical', 'MT', 2], ['NAD', 'Namibia Dollar', '$', 2],
            ['NGN', 'Naira', '₦', 2], ['NIO', 'Córdoba Oro', 'C$', 2], ['NOK', 'Norwegian Krone', 'kr', 2],
            ['NPR', 'Nepalese Rupee', '₨', 2], ['NZD', 'New Zealand Dollar', '$', 2], ['OMR', 'Rial Omani', 'ر.ع.', 3],
            ['PAB', 'Balboa', 'B/.', 2], ['PEN', 'Sol', 'S/', 2], ['PGK', 'Kina', 'K', 2],
            ['PHP', 'Philippine Peso', '₱', 2], ['PKR', 'Pakistan Rupee', '₨', 2], ['PLN', 'Zloty', 'zł', 2],
            ['PYG', 'Guarani', '₲', 0], ['QAR', 'Qatari Rial', 'ر.ق', 2], ['RON', 'Romanian Leu', 'lei', 2],
            ['RSD', 'Serbian Dinar', 'дин', 2], ['RUB', 'Russian Ruble', '₽', 2], ['RWF', 'Rwanda Franc', 'FRw', 0],
            ['SAR', 'Saudi Riyal', '﷼', 2], ['SBD', 'Solomon Islands Dollar', '$', 2], ['SCR', 'Seychelles Rupee', '₨', 2],
            ['SDG', 'Sudanese Pound', 'ج.س.', 2], ['SEK', 'Swedish Krona', 'kr', 2], ['SGD', 'Singapore Dollar', '$', 2],
            ['SHP', 'Saint Helena Pound', '£', 2], ['SLE', 'Leone', 'Le', 2], ['SOS', 'Somali Shilling', 'Sh', 2],
            ['SRD', 'Surinam Dollar', '$', 2], ['SSP', 'South Sudanese Pound', '£', 2], ['STN', 'Dobra', 'Db', 2],
            ['SVC', 'El Salvador Colón', '₡', 2], ['SYP', 'Syrian Pound', '£', 2], ['SZL', 'Lilangeni', 'L', 2],
            ['THB', 'Baht', '฿', 2], ['TJS', 'Somoni', 'ЅМ', 2], ['TMT', 'Turkmenistan Manat', 'm', 2],
            ['TND', 'Tunisian Dinar', 'د.ت', 3], ['TOP', 'Paʻanga', 'T$', 2], ['TRY', 'Turkish Lira', '₺', 2],
            ['TTD', 'Trinidad and Tobago Dollar', '$', 2], ['TWD', 'New Taiwan Dollar', '$', 2], ['TZS', 'Tanzanian Shilling', 'Sh', 2],
            ['UAH', 'Hryvnia', '₴', 2], ['UGX', 'Uganda Shilling', 'USh', 0], ['USD', 'US Dollar', '$', 2],
            ['UYU', 'Peso Uruguayo', '$', 2], ['UZS', 'Uzbekistan Sum', 'сўм', 2], ['VED', 'Bolívar Soberano', 'Bs.', 2],
            ['VND', 'Dong', '₫', 0], ['VUV', 'Vatu', 'VT', 0], ['WST', 'Tala', 'T', 2],
            ['XAF', 'CFA Franc BEAC', 'FCFA', 0], ['XCD', 'East Caribbean Dollar', '$', 2], ['XOF', 'CFA Franc BCEAO', 'CFA', 0],
            ['XPF', 'CFP Franc', '₣', 0], ['YER', 'Yemeni Rial', '﷼', 2], ['ZAR', 'Rand', 'R', 2],
            ['ZMW', 'Zambian Kwacha', 'ZK', 2], ['ZWL', 'Zimbabwe Dollar', '$', 2],
        ];

        foreach ($catalogue as [$code, $name, $symbol, $minorUnits]) {
            Currency::query()->updateOrCreate(['code' => $code], [
                'name' => $name, 'symbol' => $symbol, 'minor_units' => $minorUnits,
                'enabled' => in_array($code, $enabled, true),
            ]);
        }
    }
}
