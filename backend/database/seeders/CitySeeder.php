<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    /**
     * Seed approved cities for a curated set of countries.
     *
     * Note: This project stores the country as ISO 3166-1 alpha-2 code in `cities.country`.
     * There is no separate `countries` table.
     */
    public function run(): void
    {
        $countryCities = [
            'IN' => [
                'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur',
            ],
            'CN' => [
                'Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Chongqing', 'Tianjin', 'Wuhan', 'Chengdu', 'Hangzhou',
            ],
            'US' => [
                'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas',
            ],
            'ID' => [
                'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bekasi', 'Depok', 'Tangerang', 'Semarang',
            ],
            'PK' => [
                'Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Peshawar', 'Quetta',
            ],
            'NG' => [
                'Lagos', 'Abuja', 'Ibadan', 'Benin City', 'Port Harcourt', 'Onitsha', 'Enugu', 'Aba',
            ],
            'BR' => [
                'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Salvador', 'Fortaleza', 'Recife', 'Porto Alegre',
            ],
            'BD' => [
                'Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj', 'Khulna', 'Sylhet', 'Rajshahi',
            ],
            'RU' => [
                'Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk',
                'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm', 'Voronezh', 'Volgograd', 'Saratov',
                'Krasnodar', 'Tolyatti', 'Izhevsk', 'Barnaul',
            ],
            'ET' => [
                'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa', 'Bahir Dar',
            ],
            'MX' => [
                'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Toluca', 'Tijuana', 'León', 'Querétaro',
            ],
            'JP' => [
                'Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto',
            ],
            'EG' => [
                'Cairo', 'Giza', 'Alexandria', 'Shubra El-Kheima', 'Port Said', 'Suez', 'Mansoura',
            ],
            'PH' => [
                'Quezon City', 'Manila', 'Davao City', 'Cebu City', 'Caloocan', 'Makati', 'Pasig',
            ],
            'CD' => [
                'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Kananga', 'Kolwezi',
            ],
            'VN' => [
                'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Bien Hoa', 'Hue', 'Nha Trang', 'Vung Tau',
            ],
            'IR' => [
                'Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Shiraz', 'Tabriz', 'Qom',
            ],
            'TR' => [
                'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
            ],
            'DE' => [
                'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
            ],
            'TH' => [
                'Bangkok', 'Nonthaburi', 'Samut Prakan', 'Chiang Mai', 'Hat Yai', 'Phuket',
            ],
            'TZ' => [
                'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro',
            ],
            'GB' => [
                'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Bristol', 'Sheffield',
            ],
            'FR' => [
                'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
            ],
            'ZA' => [
                'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Soweto', 'Bloemfontein',
            ],
            'IT' => [
                'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Bologna', 'Florence',
            ],
            'KE' => [
                'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika',
            ],
            'MM' => [
                'Yangon', 'Mandalay', 'Naypyidaw', 'Mawlamyine', 'Bago',
            ],
            'CO' => [
                'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga',
            ],
            'KR' => [
                'Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon',
            ],
            'SD' => [
                'Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'El Obeid',
            ],
            'UG' => [
                'Kampala', 'Wakiso', 'Mukono', 'Gulu', 'Mbarara',
            ],
            'ES' => [
                'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga',
            ],
            'DZ' => [
                'Algiers', 'Oran', 'Constantine', 'Annaba', 'Batna',
            ],
            'IQ' => [
                'Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 'Karbala',
            ],
            'AR' => [
                'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata',
            ],
            'AF' => [
                'Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Jalalabad',
            ],
            'YE' => [
                "Sana'a", 'Aden', 'Taiz', 'Al Hudaydah', 'Ibb',
            ],
            'CA' => [
                'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa',
            ],
            'AO' => [
                'Luanda', 'Huambo', 'Lobito', 'Benguela', 'Lubango',
            ],
            'UA' => [
                'Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Lviv', 'Zaporizhzhia', 'Kryvyi Rih', 'Mykolaiv', 'Mariupol',
                'Vinnytsia', 'Chernihiv', 'Poltava', 'Cherkasy', 'Sumy', 'Zhytomyr', 'Kropyvnytskyi', 'Rivne',
                'Ternopil', 'Ivano-Frankivsk', 'Chernivtsi', 'Khmelnytskyi', 'Kramatorsk', 'Melitopol', 'Berdyansk',
                'Sloviansk',
            ],
            'MA' => [
                'Casablanca', 'Rabat', 'Fes', 'Marrakesh', 'Tangier', 'Agadir',
            ],
            'PL' => [
                'Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk',
            ],
            'UZ' => [
                'Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan',
            ],
            'MY' => [
                'Kuala Lumpur', 'Petaling Jaya', 'Subang Jaya', 'Johor Bahru', 'Penang',
            ],
            'MZ' => [
                'Maputo', 'Matola', 'Beira', 'Nampula', 'Chimoio',
            ],
            'GH' => [
                'Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast',
            ],
            'PE' => [
                'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura',
            ],
            'SA' => [
                'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar',
            ],
            'MG' => [
                'Antananarivo', 'Toamasina', 'Antsirabe', 'Fianarantsoa', 'Mahajanga',
            ],
            'CI' => [
                'Abidjan', 'Bouaké', 'Daloa', 'San-Pédro', 'Yamoussoukro',
            ],
        ];

        foreach ($countryCities as $country => $cities) {
            $country = strtoupper($country);

            foreach ($cities as $name) {
                $city = City::where('country', $country)
                    ->where('name', $name)
                    ->first();

                if (! $city) {
                    City::create([
                        'name' => $name,
                        'country' => $country,
                        'approved_at' => now(),
                        'created_by' => null,
                        'description' => null,
                    ]);

                    continue;
                }

                if ($city->approved_at === null) {
                    $city->approve();
                }
            }
        }
    }
}
